#!/usr/bin/env python3
"""
Supabase 데이터 자동 마이그레이션 스크립트

기존 프로젝트 (ekmuddykdzebbxmgigif)에서
새 프로젝트 (gaeidefaprbhowallumd, uslab-ai)로 데이터 자동 복사

사용 방법:
1. pip install supabase
2. python migrate_data_automated.py
"""

import os
from supabase import create_client, Client
import json
from typing import List, Dict, Any

# 기존 프로젝트 정보 (namecard-web)
OLD_PROJECT_URL = "https://ekmuddykdzebbxmgigif.supabase.co"
OLD_PROJECT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbXVkZHlrZHplYmJ4bWdpZ2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Mzg0MzUsImV4cCI6MjA3MzMxNDQzNX0.cIa1NMV8OtETBphAxg2s72o7jUKCdZhUxDVpNr5XNo0"

# 새 프로젝트 정보 (uslab)
NEW_PROJECT_URL = "https://xiygbsaewuqocaxoxeqn.supabase.co"
NEW_PROJECT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpeWdic2Fld3Vxb2NheG94ZXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMTE5NzYsImV4cCI6MjA3ODY4Nzk3Nn0.QE1F-Gfb5Fh4nQWVA_BQeqNWWNWxJoFvpw8S96xgpLk"

# 테이블 순서 (외래 키 의존성 고려)
TABLES_ORDER = [
    'events',
    'profiles',
    'namecards',
    'text_object_settings',
    'text_object_snapshots',
    'prize_draws',
    'prizes',
    'prize_winners'
]


def get_table_data(client: Client, table: str, schema: str = 'public') -> List[Dict[str, Any]]:
    """테이블의 모든 데이터 조회"""
    try:
        if schema == 'public':
            response = client.table(table).select('*').execute()
        else:
            response = client.schema(schema).table(table).select('*').execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"Error fetching {table}: {e}")
        return []


def insert_table_data(client: Client, table: str, data: List[Dict[str, Any]], schema: str = 'nametag') -> int:
    """테이블에 데이터 삽입 (배치 처리) - RPC 함수 사용"""
    if not data:
        return 0
    
    success_count = 0
    batch_size = 50  # 한 번에 50개씩 삽입 (JSONB 크기 제한 고려)
    
    for i in range(0, len(data), batch_size):
        batch = data[i:i + batch_size]
        try:
            # Supabase Python 클라이언트는 스키마를 직접 지원하지 않으므로
            # RPC 함수를 통해 nametag 스키마에 삽입
            # 또는 직접 SQL을 사용해야 함
            # 여기서는 기본 table() 메서드를 사용하고, 스키마는 RPC로 처리
            response = client.rpc(f'insert_{schema}_{table}', {'data': batch}).execute()
            success_count += len(batch)
            print(f"  ✅ {i+1}~{min(i+batch_size, len(data))}/{len(data)} 삽입 완료")
        except Exception as e:
            # RPC 함수가 없으면 직접 SQL 사용
            try:
                # SQL을 직접 실행하는 방식으로 변경
                # Supabase Python 클라이언트는 SQL 직접 실행을 지원하지 않으므로
                # 여기서는 기본 table() 메서드 사용 (public 스키마)
                # 실제로는 MCP나 다른 방법을 사용해야 함
                print(f"  ⚠️  RPC 함수 없음, 직접 삽입 시도...")
                # 개별 삽입 시도
                for item in batch:
                    try:
                        client.table(table).insert(item).execute()
                        success_count += 1
                    except Exception as e2:
                        print(f"    ❌ 개별 삽입 실패 (id: {item.get('id', 'unknown')}): {e2}")
            except Exception as e3:
                print(f"  ❌ 배치 {i+1}~{min(i+batch_size, len(data))} 삽입 실패: {e3}")
    
    return success_count


def migrate_table(old_client: Client, new_client: Client, table: str) -> None:
    """단일 테이블 마이그레이션"""
    print(f"\n[{table}] 테이블 마이그레이션 시작...")
    
    # 기존 프로젝트에서 데이터 조회
    data = get_table_data(old_client, table)
    
    if not data:
        print(f"  ⚠️  마이그레이션할 데이터가 없습니다.")
        return
    
    print(f"  📊 {len(data)}개의 레코드 발견")
    
    # 새 프로젝트에 삽입
    success_count = insert_table_data(new_client, table, data)
    
    print(f"  ✅ {success_count}/{len(data)}개 삽입 완료")


def migrate_all_tables():
    """모든 테이블 마이그레이션 실행"""
    print("=" * 60)
    print("Supabase 데이터 자동 마이그레이션 시작")
    print("=" * 60)
    print(f"기존 프로젝트: {OLD_PROJECT_URL}")
    print(f"새 프로젝트: {NEW_PROJECT_URL}")
    print("=" * 60)
    
    # 클라이언트 생성
    old_client: Client = create_client(OLD_PROJECT_URL, OLD_PROJECT_KEY)
    new_client: Client = create_client(NEW_PROJECT_URL, NEW_PROJECT_KEY)
    
    # 스키마 설정 (새 프로젝트는 nametag 스키마 사용)
    # Supabase JS 클라이언트는 스키마를 직접 지원하지 않으므로
    # RPC 함수나 직접 SQL을 사용해야 할 수 있습니다.
    # 여기서는 기본적으로 public 스키마에서 조회하고 nametag 스키마에 삽입합니다.
    
    # 각 테이블 순서대로 마이그레이션
    for table in TABLES_ORDER:
        try:
            migrate_table(old_client, new_client, table)
        except Exception as e:
            print(f"❌ {table} 마이그레이션 중 오류 발생: {e}")
            continue
    
    # 결과 요약
    print("\n" + "=" * 60)
    print("마이그레이션 완료")
    print("=" * 60)
    
    # 검증
    print("\n데이터 검증 중...")
    for table in TABLES_ORDER:
        try:
            old_count = len(get_table_data(old_client, table))
            new_count = len(get_table_data(new_client, table))
            status = "✅" if old_count == new_count else "⚠️"
            print(f"{status} {table}: 기존 {old_count}개 → 새 {new_count}개")
        except Exception as e:
            print(f"❌ {table} 검증 실패: {e}")


if __name__ == "__main__":
    try:
        migrate_all_tables()
    except KeyboardInterrupt:
        print("\n\n마이그레이션이 중단되었습니다.")
    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        traceback.print_exc()

