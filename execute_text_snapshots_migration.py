#!/usr/bin/env python3
"""
text_object_snapshots 테이블 마이그레이션 실행
원래 프로젝트에서 데이터를 가져와서 새 프로젝트에 직접 삽입
"""

from supabase import create_client, Client
import json

# 원래 프로젝트 정보
OLD_PROJECT_URL = "https://ekmuddykdzebbxmgigif.supabase.co"
OLD_PROJECT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbXVkZHlrZHplYmJ4bWdpZ2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Mzg0MzUsImV4cCI6MjA3MzMxNDQzNX0.cIa1NMV8OtETBphAxg2s72o7jUKCdZhUxDVpNr5XNo0"

# 새 프로젝트 정보
NEW_PROJECT_URL = "https://xiygbsaewuqocaxoxeqn.supabase.co"
NEW_PROJECT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpeWdic2Fld3Vxb2NheG94ZXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMTE5NzYsImV4cCI6MjA3ODY4Nzk3Nn0.QE1F-Gfb5Fh4nQWVA_BQeqNWWNWxJoFvpw8S96xgpLk"

def get_table_data(client: Client, table: str):
    """테이블의 모든 데이터 조회"""
    try:
        response = client.table(table).select('*').execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"Error fetching {table}: {e}")
        return []

def main():
    print("=" * 60)
    print("text_object_snapshots 테이블 마이그레이션 실행")
    print("=" * 60)
    
    old_client = create_client(OLD_PROJECT_URL, OLD_PROJECT_KEY)
    new_client = create_client(NEW_PROJECT_URL, NEW_PROJECT_KEY)
    
    print("\n[text_object_snapshots] 데이터 조회 중...")
    data = get_table_data(old_client, 'text_object_snapshots')
    
    if not data:
        print("  ⚠️  마이그레이션할 데이터가 없습니다.")
        return
    
    print(f"  📊 {len(data)}개의 레코드 발견")
    
    # 배치로 나누어 삽입
    batch_size = 10
    success_count = 0
    
    for i in range(0, len(data), batch_size):
        batch = data[i:i + batch_size]
        print(f"\n  📦 배치 {i//batch_size + 1}/{(len(data) + batch_size - 1)//batch_size} 처리 중...")
        
        try:
            # JSON 필드를 JSONB로 변환
            for item in batch:
                if isinstance(item.get('company_layout'), str):
                    item['company_layout'] = json.loads(item['company_layout'])
                if isinstance(item.get('name_layout'), str):
                    item['name_layout'] = json.loads(item['name_layout'])
                if isinstance(item.get('title_layout'), str):
                    item['title_layout'] = json.loads(item['title_layout'])
                if isinstance(item.get('full_state'), str):
                    item['full_state'] = json.loads(item['full_state'])
            
            # RPC 함수를 사용하여 nametag 스키마에 삽입
            response = new_client.rpc('insert_text_object_snapshots_batch', {'data': batch}).execute()
            success_count += len(batch)
            print(f"  ✅ {i+1}~{min(i+batch_size, len(data))}/{len(data)} 삽입 완료")
        except Exception as e:
            print(f"  ❌ 배치 삽입 실패: {e}")
            # 개별 삽입 시도
            for item in batch:
                try:
                    # JSON 필드 변환
                    if isinstance(item.get('company_layout'), str):
                        item['company_layout'] = json.loads(item['company_layout'])
                    if isinstance(item.get('name_layout'), str):
                        item['name_layout'] = json.loads(item['name_layout'])
                    if isinstance(item.get('title_layout'), str):
                        item['title_layout'] = json.loads(item['title_layout'])
                    if isinstance(item.get('full_state'), str):
                        item['full_state'] = json.loads(item['full_state'])
                    
                    new_client.table('text_object_snapshots').insert(item).execute()
                    success_count += 1
                except Exception as e2:
                    print(f"    ❌ 개별 삽입 실패 (id: {item.get('id', 'unknown')}): {e2}")
    
    print("\n" + "=" * 60)
    print("마이그레이션 완료")
    print("=" * 60)
    print(f"성공: {success_count}개")
    print(f"실패: {len(data) - success_count}개")
    print(f"전체: {len(data)}개")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        traceback.print_exc()

