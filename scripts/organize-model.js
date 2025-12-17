#!/usr/bin/env node

/**
 * Live2D Model Organizer
 * 
 * Cubism Editor에서 내보낸 모델 폴더를 웹에서 사용 가능한 구조로 정리합니다.
 * 
 * 사용법:
 *   node scripts/organize-model.js <input-folder> [output-folder]
 * 
 * 예시:
 *   node scripts/organize-model.js src/assets/mao_pro_en
 *   node scripts/organize-model.js src/assets/mao_pro_en src/assets/Mao
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 웹에서 필요한 파일 확장자
const REQUIRED_EXTENSIONS = [
  '.model3.json',
  '.moc3',
  '.physics3.json',
  '.pose3.json',
  '.cdi3.json',
  '.userdata3.json',
  '.motion3.json',
  '.exp3.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.wav',
  '.mp3',
];

// 제외할 파일/폴더
const EXCLUDE_PATTERNS = [
  '.cmo3',      // Cubism Editor 모델 파일
  '.can3',      // Cubism Editor 애니메이션 파일
  '.DS_Store',  // macOS 시스템 파일
  'Thumbs.db',  // Windows 시스템 파일
  'ReadMe.txt', // 읽어보기 파일
  'readme.txt',
];

// 색상 출력
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 파일이 필요한 파일인지 확인
 */
function isRequiredFile(filename) {
  const lower = filename.toLowerCase();
  
  // 제외 패턴 체크
  for (const pattern of EXCLUDE_PATTERNS) {
    if (lower.includes(pattern.toLowerCase())) {
      return false;
    }
  }
  
  // 필요한 확장자 체크
  for (const ext of REQUIRED_EXTENSIONS) {
    if (lower.endsWith(ext.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * 디렉토리 내 모든 파일 재귀적으로 가져오기
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

/**
 * model3.json 파일 찾기
 */
function findModelJson(dirPath) {
  const allFiles = getAllFiles(dirPath);
  return allFiles.find(f => f.endsWith('.model3.json'));
}

/**
 * model3.json 파일 분석하여 필요한 파일 목록 추출
 */
function analyzeModelJson(modelJsonPath) {
  const content = JSON.parse(fs.readFileSync(modelJsonPath, 'utf-8'));
  const modelDir = path.dirname(modelJsonPath);
  const files = new Set();
  
  // model3.json 자체 추가
  files.add(modelJsonPath);
  
  const refs = content.FileReferences || {};
  
  // Moc 파일
  if (refs.Moc) {
    files.add(path.join(modelDir, refs.Moc));
  }
  
  // 텍스처
  if (refs.Textures) {
    refs.Textures.forEach(tex => {
      files.add(path.join(modelDir, tex));
    });
  }
  
  // Physics
  if (refs.Physics) {
    files.add(path.join(modelDir, refs.Physics));
  }
  
  // Pose
  if (refs.Pose) {
    files.add(path.join(modelDir, refs.Pose));
  }
  
  // DisplayInfo (cdi3)
  if (refs.DisplayInfo) {
    files.add(path.join(modelDir, refs.DisplayInfo));
  }
  
  // UserData
  if (refs.UserData) {
    files.add(path.join(modelDir, refs.UserData));
  }
  
  // Expressions
  if (refs.Expressions) {
    refs.Expressions.forEach(exp => {
      files.add(path.join(modelDir, exp.File));
    });
  }
  
  // Motions
  if (refs.Motions) {
    Object.values(refs.Motions).forEach(motionGroup => {
      motionGroup.forEach(motion => {
        files.add(path.join(modelDir, motion.File));
        // Sound 파일도 포함
        if (motion.Sound) {
          files.add(path.join(modelDir, motion.Sound));
        }
      });
    });
  }
  
  return { files: Array.from(files), modelDir, content };
}

/**
 * 폴더 구조 정리
 */
function organizeModel(inputDir, outputDir) {
  log(`\n📁 입력 폴더: ${inputDir}`, 'blue');
  
  // 입력 폴더 확인
  if (!fs.existsSync(inputDir)) {
    log(`❌ 폴더를 찾을 수 없습니다: ${inputDir}`, 'red');
    process.exit(1);
  }
  
  // model3.json 찾기
  let modelJsonPath = findModelJson(inputDir);
  
  if (!modelJsonPath) {
    log('❌ model3.json 파일을 찾을 수 없습니다.', 'red');
    process.exit(1);
  }
  
  log(`✓ model3.json 발견: ${modelJsonPath}`, 'green');
  
  // 모델 분석
  const { files, modelDir, content } = analyzeModelJson(modelJsonPath);
  
  log(`\n📋 필요한 파일 목록 (${files.length}개):`, 'blue');
  files.forEach(f => {
    const exists = fs.existsSync(f);
    const status = exists ? '✓' : '✗';
    const color = exists ? 'dim' : 'red';
    log(`  ${status} ${path.relative(modelDir, f)}`, color);
  });
  
  // 출력 폴더 결정
  if (!outputDir) {
    // 모델 이름 추출 (model3.json 파일명에서)
    const modelName = path.basename(modelJsonPath, '.model3.json');
    // 첫 글자 대문자로
    const formattedName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
    outputDir = path.join(path.dirname(inputDir), formattedName);
  }
  
  log(`\n📦 출력 폴더: ${outputDir}`, 'blue');
  
  // 출력 폴더가 이미 존재하는지 확인
  if (fs.existsSync(outputDir)) {
    log(`⚠️  출력 폴더가 이미 존재합니다. 덮어씁니다.`, 'yellow');
  }
  
  // 출력 폴더 생성
  fs.mkdirSync(outputDir, { recursive: true });
  
  // 파일 복사
  let copiedCount = 0;
  let errorCount = 0;
  
  files.forEach(srcPath => {
    if (!fs.existsSync(srcPath)) {
      log(`  ⚠️  파일 없음: ${path.relative(modelDir, srcPath)}`, 'yellow');
      errorCount++;
      return;
    }
    
    const relativePath = path.relative(modelDir, srcPath);
    const destPath = path.join(outputDir, relativePath);
    
    // 대상 디렉토리 생성
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    
    // 파일 복사
    fs.copyFileSync(srcPath, destPath);
    copiedCount++;
  });
  
  // model3.json 파일명 통일 (폴더명과 일치하도록)
  const outputName = path.basename(outputDir);
  const oldModelJson = path.join(outputDir, path.basename(modelJsonPath));
  const newModelJson = path.join(outputDir, `${outputName}.model3.json`);
  
  if (oldModelJson !== newModelJson && fs.existsSync(oldModelJson)) {
    // model3.json 내용 업데이트 (파일 참조 경로는 상대경로이므로 변경 불필요)
    fs.renameSync(oldModelJson, newModelJson);
    log(`  ✓ model3.json 이름 변경: ${path.basename(oldModelJson)} → ${path.basename(newModelJson)}`, 'green');
  }
  
  // 결과 출력
  log(`\n✅ 완료!`, 'green');
  log(`   - 복사된 파일: ${copiedCount}개`, 'dim');
  if (errorCount > 0) {
    log(`   - 누락된 파일: ${errorCount}개`, 'yellow');
  }
  log(`   - 출력 위치: ${outputDir}`, 'dim');
  
  // 사용법 안내
  log(`\n💡 사용하려면 LAppDefine.ts에서:`, 'blue');
  log(`   export const ModelDir: string[] = ['${outputName}'];`, 'dim');
  
  return outputDir;
}

/**
 * 모델 검증 및 수정
 */
function validateModel(modelDir, autoFix = false) {
  const modelJsonFiles = fs.readdirSync(modelDir).filter(f => f.endsWith('.model3.json'));
  
  if (modelJsonFiles.length === 0) {
    log('❌ model3.json 파일이 없습니다.', 'red');
    return false;
  }
  
  const modelJsonPath = path.join(modelDir, modelJsonFiles[0]);
  let content = JSON.parse(fs.readFileSync(modelJsonPath, 'utf-8'));
  
  log(`\n🔍 모델 검증: ${modelJsonFiles[0]}`, 'blue');
  
  const refs = content.FileReferences || {};
  let valid = true;
  let modified = false;
  
  // Moc 파일 확인
  if (refs.Moc) {
    const mocPath = path.join(modelDir, refs.Moc);
    if (fs.existsSync(mocPath)) {
      log(`  ✓ Moc: ${refs.Moc}`, 'green');
    } else {
      log(`  ✗ Moc 없음: ${refs.Moc}`, 'red');
      valid = false;
    }
  }
  
  // 텍스처 확인
  if (refs.Textures) {
    refs.Textures.forEach(tex => {
      const texPath = path.join(modelDir, tex);
      if (fs.existsSync(texPath)) {
        log(`  ✓ Texture: ${tex}`, 'green');
      } else {
        log(`  ✗ Texture 없음: ${tex}`, 'red');
        valid = false;
      }
    });
  }
  
  // HitAreas 확인 및 수정
  if (content.HitAreas) {
    content.HitAreas.forEach(area => {
      if (!area.Name || area.Name === '') {
        if (autoFix) {
          // HitAreaHead -> Head, HitAreaBody -> Body
          const newName = area.Id.replace('HitArea', '');
          area.Name = newName || area.Id;
          log(`  🔧 HitArea "${area.Id}" Name 설정: "${area.Name}"`, 'green');
          modified = true;
        } else {
          log(`  ⚠️  HitArea "${area.Id}"의 Name이 비어있음 (--fix로 수정 가능)`, 'yellow');
        }
      }
    });
  }
  
  // Motions 그룹 확인 및 수정
  if (refs.Motions) {
    const groups = Object.keys(refs.Motions);
    
    if (groups.includes('')) {
      if (autoFix) {
        // 빈 문자열 그룹을 TapBody로 변경
        refs.Motions['TapBody'] = refs.Motions[''];
        delete refs.Motions[''];
        log(`  🔧 빈 모션 그룹을 "TapBody"로 변경`, 'green');
        modified = true;
      } else {
        log(`  ⚠️  빈 문자열("") 모션 그룹이 있음 (--fix로 수정 가능)`, 'yellow');
      }
    }
    
    if (!groups.includes('Idle')) {
      log(`  ⚠️  Idle 모션 그룹이 없음`, 'yellow');
    }
  }
  
  // 수정된 내용 저장
  if (modified) {
    fs.writeFileSync(modelJsonPath, JSON.stringify(content, null, '\t'));
    log(`\n💾 model3.json 수정 사항 저장됨`, 'green');
  }
  
  return valid;
}

// CLI 실행
const args = process.argv.slice(2);

// --fix 옵션 확인
const fixIndex = args.indexOf('--fix');
const autoFix = fixIndex !== -1;
if (fixIndex !== -1) {
  args.splice(fixIndex, 1);
}

if (args.length === 0) {
  log('\n📖 Live2D Model Organizer', 'blue');
  log('\n사용법:', 'yellow');
  log('  node scripts/organize-model.js <input-folder> [output-folder] [--fix]');
  log('\n예시:', 'yellow');
  log('  node scripts/organize-model.js src/assets/mao_pro_en');
  log('  node scripts/organize-model.js src/assets/mao_pro_en src/assets/Mao');
  log('  node scripts/organize-model.js src/assets/mao_pro_en --fix');
  log('\n옵션:', 'yellow');
  log('  --fix    HitArea 이름, 빈 모션 그룹 등을 자동으로 수정');
  log('\n기능:', 'yellow');
  log('  - runtime/ 폴더에서 필요한 파일만 추출');
  log('  - .cmo3, .can3 등 Editor 파일 제외');
  log('  - 웹에서 바로 사용 가능한 구조로 정리');
  process.exit(0);
}

const inputDir = path.resolve(args[0]);
const outputDir = args[1] ? path.resolve(args[1]) : null;

const result = organizeModel(inputDir, outputDir);
validateModel(result, autoFix);
