/**
 * WAV 파일 핸들러
 */
class WavFileInfo {
  _fileName = '';
  _numberOfChannels = 0;
  _bitsPerSample = 0;
  _samplingRate = 0;
  _samplesPerChannel = 0;
}

class ByteReader {
  _fileByte: ArrayBuffer | null = null;
  _fileDataView: DataView | null = null;
  _fileSize = 0;
  _readOffset = 0;

  public get8(): number {
    const ret = this._fileDataView!.getUint8(this._readOffset);
    this._readOffset++;
    return ret;
  }

  public get16LittleEndian(): number {
    const ret =
      (this._fileDataView!.getUint8(this._readOffset + 1) << 8) |
      this._fileDataView!.getUint8(this._readOffset);
    this._readOffset += 2;
    return ret;
  }

  public get24LittleEndian(): number {
    const ret =
      (this._fileDataView!.getUint8(this._readOffset + 2) << 16) |
      (this._fileDataView!.getUint8(this._readOffset + 1) << 8) |
      this._fileDataView!.getUint8(this._readOffset);
    this._readOffset += 3;
    return ret;
  }

  public get32LittleEndian(): number {
    const ret =
      (this._fileDataView!.getUint8(this._readOffset + 3) << 24) |
      (this._fileDataView!.getUint8(this._readOffset + 2) << 16) |
      (this._fileDataView!.getUint8(this._readOffset + 1) << 8) |
      this._fileDataView!.getUint8(this._readOffset);
    this._readOffset += 4;
    return ret;
  }

  public getCheckSignature(reference: string): boolean {
    const getSignature: Uint8Array = new Uint8Array(4);
    const referenceString: Uint8Array = new TextEncoder().encode(reference);
    if (reference.length !== 4) {
      return false;
    }
    for (let signatureOffset = 0; signatureOffset < 4; signatureOffset++) {
      getSignature[signatureOffset] = this.get8();
    }
    return (
      getSignature[0] === referenceString[0] &&
      getSignature[1] === referenceString[1] &&
      getSignature[2] === referenceString[2] &&
      getSignature[3] === referenceString[3]
    );
  }
}

export class LAppWavFileHandler {
  private _pcmData: Array<Float32Array> | null = null;
  private _userTimeSeconds = 0.0;
  private _lastRms = 0.0;
  private _sampleOffset = 0.0;
  private _wavFileInfo = new WavFileInfo();
  private _byteReader = new ByteReader();

  public update(deltaTimeSeconds: number): boolean {
    if (
      this._pcmData === null ||
      this._sampleOffset >= this._wavFileInfo._samplesPerChannel
    ) {
      this._lastRms = 0.0;
      return false;
    }

    this._userTimeSeconds += deltaTimeSeconds;
    let goalOffset = Math.floor(
      this._userTimeSeconds * this._wavFileInfo._samplingRate
    );
    if (goalOffset > this._wavFileInfo._samplesPerChannel) {
      goalOffset = this._wavFileInfo._samplesPerChannel;
    }

    let rms = 0.0;
    for (
      let channelCount = 0;
      channelCount < this._wavFileInfo._numberOfChannels;
      channelCount++
    ) {
      for (
        let sampleCount = this._sampleOffset;
        sampleCount < goalOffset;
        sampleCount++
      ) {
        const pcm = this._pcmData[channelCount][sampleCount];
        rms += pcm * pcm;
      }
    }
    rms = Math.sqrt(
      rms /
        (this._wavFileInfo._numberOfChannels *
          (goalOffset - this._sampleOffset))
    );

    this._lastRms = rms;
    this._sampleOffset = goalOffset;
    return true;
  }

  public start(filePath: string): void {
    this._sampleOffset = 0;
    this._userTimeSeconds = 0.0;
    this._lastRms = 0.0;
    this.loadWavFile(filePath);
  }

  public getRms(): number {
    return this._lastRms;
  }

  public async loadWavFile(filePath: string): Promise<boolean> {
    if (this._pcmData !== null) {
      this.releasePcmData();
    }

    try {
      const response = await fetch(filePath);
      this._byteReader._fileByte = await response.arrayBuffer();
      this._byteReader._fileDataView = new DataView(this._byteReader._fileByte);
      this._byteReader._fileSize = this._byteReader._fileByte.byteLength;
      this._byteReader._readOffset = 0;

      if (
        this._byteReader._fileByte === null ||
        this._byteReader._fileSize < 4
      ) {
        return false;
      }

      this._wavFileInfo._fileName = filePath;

      if (!this._byteReader.getCheckSignature('RIFF')) {
        return false;
      }
      this._byteReader.get32LittleEndian();
      if (!this._byteReader.getCheckSignature('WAVE')) {
        return false;
      }
      if (!this._byteReader.getCheckSignature('fmt ')) {
        return false;
      }

      const fmtChunkSize = this._byteReader.get32LittleEndian();
      if (this._byteReader.get16LittleEndian() !== 1) {
        return false;
      }

      this._wavFileInfo._numberOfChannels = this._byteReader.get16LittleEndian();
      this._wavFileInfo._samplingRate = this._byteReader.get32LittleEndian();
      this._byteReader.get32LittleEndian();
      this._byteReader.get16LittleEndian();
      this._wavFileInfo._bitsPerSample = this._byteReader.get16LittleEndian();

      if (fmtChunkSize > 16) {
        this._byteReader._readOffset += fmtChunkSize - 16;
      }

      while (
        !this._byteReader.getCheckSignature('data') &&
        this._byteReader._readOffset < this._byteReader._fileSize
      ) {
        this._byteReader._readOffset += this._byteReader.get32LittleEndian() + 4;
      }

      if (this._byteReader._readOffset >= this._byteReader._fileSize) {
        return false;
      }

      const dataChunkSize = this._byteReader.get32LittleEndian();
      this._wavFileInfo._samplesPerChannel =
        (dataChunkSize * 8) /
        (this._wavFileInfo._bitsPerSample * this._wavFileInfo._numberOfChannels);

      this._pcmData = new Array(this._wavFileInfo._numberOfChannels);
      for (
        let channelCount = 0;
        channelCount < this._wavFileInfo._numberOfChannels;
        channelCount++
      ) {
        this._pcmData[channelCount] = new Float32Array(
          this._wavFileInfo._samplesPerChannel
        );
      }

      for (
        let sampleCount = 0;
        sampleCount < this._wavFileInfo._samplesPerChannel;
        sampleCount++
      ) {
        for (
          let channelCount = 0;
          channelCount < this._wavFileInfo._numberOfChannels;
          channelCount++
        ) {
          this._pcmData[channelCount][sampleCount] = this.getPcmSample();
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private getPcmSample(): number {
    let pcm32;

    switch (this._wavFileInfo._bitsPerSample) {
      case 8:
        pcm32 = this._byteReader.get8() - 128;
        pcm32 <<= 24;
        break;
      case 16:
        pcm32 = this._byteReader.get16LittleEndian() << 16;
        break;
      case 24:
        pcm32 = this._byteReader.get24LittleEndian() << 8;
        break;
      default:
        pcm32 = 0;
        break;
    }

    return pcm32 / 2147483647;
  }

  public releasePcmData(): void {
    this._pcmData = null;
  }
}

