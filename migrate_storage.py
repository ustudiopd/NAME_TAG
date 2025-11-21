#!/usr/bin/env python3
"""
Supabase Storage 파일 마이그레이션 스크립트

기존 프로젝트 (ekmuddykdzebbxmgigif, namecard-web)의 namecard-images 버킷에서
새 프로젝트 (xiygbsaewuqocaxoxeqn, uslab)의 nametag-images 버킷으로 파일 복사

사용 방법:
1. pip install supabase
2. 환경 변수 설정 또는 스크립트 내 URL/KEY 수정
3. python migrate_storage.py
"""

import os
from supabase import create_client, Client
from typing import List, Optional

# 기존 프로젝트 정보 (namecard-web에서 가져옴)
OLD_PROJECT_URL = "https://ekmuddykdzebbxmgigif.supabase.co"
OLD_PROJECT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbXVkZHlrZHplYmJ4bWdpZ2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Mzg0MzUsImV4cCI6MjA3MzMxNDQzNX0.cIa1NMV8OtETBphAxg2s72o7jUKCdZhUxDVpNr5XNo0"
OLD_BUCKET = "namecard-images"

# 새 프로젝트 정보 (uslab으로 옮김)
NEW_PROJECT_URL = "https://xiygbsaewuqocaxoxeqn.supabase.co"
# Service role key 사용 (RLS 우회, 마이그레이션용)
NEW_PROJECT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpeWdic2Fld3Vxb2NheG94ZXFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzExMTk3NiwiZXhwIjoyMDc4Njg3OTc2fQ.3Ya8iv1X-QIlkpz4h4KX4dyZIPbewkhW00NMwzRVadQ"
NEW_BUCKET = "nametag-images"


def get_all_files(client: Client, bucket: str, path: str = "") -> List[dict]:
    """버킷의 모든 파일 목록 가져오기"""
    files = []
    try:
        result = client.storage.from_(bucket).list(path)
        for item in result:
            if item.get("id") is None:  # 폴더인 경우
                # 재귀적으로 하위 폴더 탐색
                sub_files = get_all_files(client, bucket, f"{path}/{item['name']}" if path else item['name'])
                files.extend(sub_files)
            else:  # 파일인 경우
                file_path = f"{path}/{item['name']}" if path else item['name']
                files.append({
                    "name": item['name'],
                    "path": file_path,
                    "size": item.get("metadata", {}).get("size", 0),
                    "created_at": item.get("created_at"),
                })
    except Exception as e:
        print(f"Error listing files in {path}: {e}")
    return files


def download_file(client: Client, bucket: str, file_path: str) -> Optional[bytes]:
    """파일 다운로드"""
    try:
        response = client.storage.from_(bucket).download(file_path)
        return response
    except Exception as e:
        print(f"Error downloading {file_path}: {e}")
        return None


def upload_file(client: Client, bucket: str, file_path: str, file_data: bytes) -> bool:
    """파일 업로드"""
    try:
        # 파일 확장자에 따라 MIME 타입 결정
        if file_path.endswith('.png'):
            content_type = "image/png"
        elif file_path.endswith('.jpg') or file_path.endswith('.jpeg'):
            content_type = "image/jpeg"
        elif file_path.endswith('.gif'):
            content_type = "image/gif"
        elif file_path.endswith('.webp'):
            content_type = "image/webp"
        else:
            content_type = "image/png"  # 기본값
        
        # upsert 옵션 사용하여 기존 파일 덮어쓰기
        response = client.storage.from_(bucket).upload(
            file_path, 
            file_data, 
            file_options={
                "content-type": content_type,
                "upsert": "true"
            }
        )
        return True
    except Exception as e:
        print(f"Error uploading {file_path}: {e}")
        return False


def migrate_storage():
    """Storage 파일 마이그레이션 실행"""
    print("=" * 60)
    print("Supabase Storage 파일 마이그레이션 시작")
    print("=" * 60)
    
    # 클라이언트 생성
    old_client: Client = create_client(OLD_PROJECT_URL, OLD_PROJECT_KEY)
    new_client: Client = create_client(NEW_PROJECT_URL, NEW_PROJECT_KEY)
    
    # 기존 버킷의 모든 파일 목록 가져오기
    print(f"\n[{OLD_BUCKET}] 버킷에서 파일 목록 조회 중...")
    files = get_all_files(old_client, OLD_BUCKET)
    
    if not files:
        print("마이그레이션할 파일이 없습니다.")
        return
    
    print(f"총 {len(files)}개의 파일을 발견했습니다.")
    
    # 파일 마이그레이션
    success_count = 0
    fail_count = 0
    
    for i, file_info in enumerate(files, 1):
        file_path = file_info["path"]
        print(f"\n[{i}/{len(files)}] {file_path} 마이그레이션 중...")
        
        # 파일 다운로드
        file_data = download_file(old_client, OLD_BUCKET, file_path)
        if file_data is None:
            print(f"  ❌ 다운로드 실패")
            fail_count += 1
            continue
        
        # 파일 업로드
        if upload_file(new_client, NEW_BUCKET, file_path, file_data):
            print(f"  ✅ 업로드 완료 ({file_info['size']} bytes)")
            success_count += 1
        else:
            print(f"  ❌ 업로드 실패")
            fail_count += 1
    
    # 결과 출력
    print("\n" + "=" * 60)
    print("마이그레이션 완료")
    print("=" * 60)
    print(f"성공: {success_count}개")
    print(f"실패: {fail_count}개")
    print(f"전체: {len(files)}개")


if __name__ == "__main__":
    try:
        migrate_storage()
    except KeyboardInterrupt:
        print("\n\n마이그레이션이 중단되었습니다.")
    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        traceback.print_exc()

