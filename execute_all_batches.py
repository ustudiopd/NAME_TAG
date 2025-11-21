#!/usr/bin/env python3
"""
모든 배치 파일을 읽어서 SQL을 생성하고 실행 지시
"""

import os

def main():
    """모든 배치 파일 확인"""
    batch_files = [f"migrate_batch_{i}.sql" for i in range(1, 13)]
    
    print("=" * 60)
    print("배치 파일 확인 및 실행 준비")
    print("=" * 60)
    
    for i, batch_file in enumerate(batch_files, 1):
        if os.path.exists(batch_file):
            with open(batch_file, 'r', encoding='utf-8') as f:
                content = f.read()
                # 첫 줄에서 정보 추출
                first_line = content.split('\n')[0]
                print(f"\n✅ 배치 {i}: {first_line}")
                print(f"   파일 크기: {len(content)} bytes")
        else:
            print(f"\n❌ 배치 {i}: 파일 없음 ({batch_file})")
    
    print("\n" + "=" * 60)
    print("모든 배치를 순차적으로 실행하세요.")
    print("각 배치 파일의 내용을 읽어서 MCP로 실행하면 됩니다.")
    print("=" * 60)

if __name__ == "__main__":
    main()

