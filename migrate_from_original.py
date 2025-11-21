#!/usr/bin/env python3
"""
원래 namecard-web 프로젝트에서 uslab 프로젝트로 데이터 마이그레이션
Supabase Python 클라이언트는 스키마를 직접 지원하지 않으므로,
데이터를 가져와서 SQL INSERT 문을 생성하고 MCP로 실행하는 방식 사용
"""

import json
from supabase import create_client, Client
from typing import List, Dict, Any

# 원래 프로젝트 정보 (namecard-web)
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
]


def get_table_data(client: Client, table: str) -> List[Dict[str, Any]]:
    """테이블의 모든 데이터 조회"""
    try:
        response = client.table(table).select('*').execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"Error fetching {table}: {e}")
        return []


def generate_insert_sql(table: str, data: List[Dict[str, Any]], schema: str = 'nametag') -> str:
    """데이터를 SQL INSERT 문으로 변환"""
    if not data:
        return ""
    
    # 컬럼 목록 추출
    columns = list(data[0].keys())
    columns_str = ', '.join(columns)
    
    # VALUES 생성
    values_list = []
    for row in data:
        values = []
        for col in columns:
            value = row.get(col)
            if value is None:
                values.append('NULL')
            elif isinstance(value, str):
                # SQL 인젝션 방지: 작은따옴표 이스케이프
                escaped = value.replace("'", "''")
                values.append(f"'{escaped}'")
            elif isinstance(value, bool):
                values.append('TRUE' if value else 'FALSE')
            elif isinstance(value, (int, float)):
                values.append(str(value))
            else:
                # UUID, 날짜 등은 문자열로 처리
                escaped = str(value).replace("'", "''")
                values.append(f"'{escaped}'")
        
        values_list.append(f"({', '.join(values)})")
    
    # SQL 문 생성
    sql = f"INSERT INTO {schema}.{table} ({columns_str})\nVALUES\n"
    sql += ",\n".join(values_list)
    sql += "\nON CONFLICT (id) DO NOTHING;"
    
    return sql


def migrate_table(old_client: Client, new_client: Client, table: str) -> None:
    """단일 테이블 마이그레이션"""
    print(f"\n[{table}] 테이블 마이그레이션 시작...")
    
    # 원래 프로젝트에서 데이터 조회
    data = get_table_data(old_client, table)
    
    if not data:
        print(f"  ⚠️  마이그레이션할 데이터가 없습니다.")
        return
    
    print(f"  📊 {len(data)}개의 레코드 발견")
    
    # 배치로 나누어 처리 (한 번에 너무 많은 데이터는 처리하지 않음)
    batch_size = 100
    success_count = 0
    
    for i in range(0, len(data), batch_size):
        batch = data[i:i + batch_size]
        print(f"  📦 배치 {i//batch_size + 1}/{(len(data) + batch_size - 1)//batch_size} 처리 중...")
        
        # 새 프로젝트에 삽입 (RPC 함수 사용)
        try:
            # RPC 함수를 사용하여 nametag 스키마에 삽입
            rpc_function = f'insert_{table}_batch'
            response = new_client.rpc(rpc_function, {'data': batch}).execute()
            success_count += len(batch)
            print(f"  ✅ {i+1}~{min(i+batch_size, len(data))}/{len(data)} 삽입 완료")
        except Exception as e:
            print(f"  ❌ 배치 삽입 실패: {e}")
            # RPC 함수가 없으면 기본 table() 메서드 사용 시도
            try:
                response = new_client.table(table).insert(batch).execute()
                success_count += len(batch)
                print(f"  ✅ (fallback) {i+1}~{min(i+batch_size, len(data))}/{len(data)} 삽입 완료")
            except Exception as e2:
                print(f"  ❌ Fallback 삽입도 실패: {e2}")
                # SQL 파일로 저장하여 수동 실행
                sql = generate_insert_sql(table, batch)
                filename = f"migrate_{table}_batch_{i//batch_size + 1}.sql"
                with open(filename, 'w', encoding='utf-8') as f:
                    f.write(f"-- {table} 테이블 배치 {i//batch_size + 1} 마이그레이션 SQL\n")
                    f.write(sql)
                print(f"  💾 SQL 파일 저장: {filename}")
    
    print(f"  ✅ {success_count}/{len(data)}개 삽입 완료")


def migrate_all_tables():
    """모든 테이블 마이그레이션 실행"""
    print("=" * 60)
    print("원래 프로젝트에서 uslab 프로젝트로 데이터 마이그레이션")
    print("=" * 60)
    print(f"원래 프로젝트: {OLD_PROJECT_URL}")
    print(f"새 프로젝트: {NEW_PROJECT_URL}")
    print("=" * 60)
    
    # 클라이언트 생성
    old_client: Client = create_client(OLD_PROJECT_URL, OLD_PROJECT_KEY)
    new_client: Client = create_client(NEW_PROJECT_URL, NEW_PROJECT_KEY)
    
    # 각 테이블 순서대로 마이그레이션
    for table in TABLES_ORDER:
        try:
            migrate_table(old_client, new_client, table)
        except Exception as e:
            print(f"❌ {table} 마이그레이션 중 오류 발생: {e}")
            continue
    
    print("\n" + "=" * 60)
    print("마이그레이션 완료")
    print("=" * 60)


if __name__ == "__main__":
    try:
        migrate_all_tables()
    except KeyboardInterrupt:
        print("\n\n마이그레이션이 중단되었습니다.")
    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        traceback.print_exc()

