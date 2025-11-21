#!/usr/bin/env python3
"""
원래 namecard-web 프로젝트에서 uslab 프로젝트로 모든 데이터 마이그레이션
MCP를 사용하여 직접 SQL 실행
"""

from supabase import create_client, Client
from typing import List, Dict, Any
import json
import re

# 원래 프로젝트 정보 (namecard-web)
OLD_PROJECT_URL = "https://ekmuddykdzebbxmgigif.supabase.co"
OLD_PROJECT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbXVkZHlrZHplYmJ4bWdpZ2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Mzg0MzUsImV4cCI6MjA3MzMxNDQzNX0.cIa1NMV8OtETBphAxg2s72o7jUKCdZhUxDVpNr5XNo0"

# 테이블 순서 (외래 키 의존성 고려)
TABLES_ORDER = [
    'profiles',
    'namecards',
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


def format_sql_value(value, is_json=False):
    """SQL 값 포맷팅"""
    if value is None:
        return 'NULL'
    elif isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    elif isinstance(value, (int, float)):
        return str(value)
    elif isinstance(value, str):
        if is_json:
            # JSON 문자열은 그대로 사용 (이미 이스케이프됨)
            return f"'{value.replace("'", "''")}'"
        else:
            # 일반 문자열
            escaped = value.replace("'", "''")
            return f"'{escaped}'"
    elif isinstance(value, dict) or isinstance(value, list):
        # JSON 객체/배열
        json_str = json.dumps(value, ensure_ascii=False)
        escaped = json_str.replace("'", "''")
        return f"'{escaped}'"
    else:
        # 기타 타입
        escaped = str(value).replace("'", "''")
        return f"'{escaped}'"


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
        # JSON 컬럼 확인 (canvas_json, snapshot_data 등)
        json_columns = ['canvas_json', 'snapshot_data', 'template_settings', 'print_areas', 
                        'company_layout', 'name_layout', 'title_layout', 'full_state']
        
        values = []
        for col in columns:
            is_json = col in json_columns
            values.append(format_sql_value(row.get(col), is_json=is_json))
        
        values_list.append(f"({', '.join(values)})")
    
    # SQL 문 생성
    sql = f"INSERT INTO {schema}.{table} ({columns_str})\nVALUES\n"
    sql += ",\n".join(values_list)
    sql += "\nON CONFLICT (id) DO NOTHING;"
    
    return sql


def main():
    """메인 함수 - 데이터 추출 및 SQL 생성"""
    print("=" * 60)
    print("원래 프로젝트에서 데이터 추출 및 SQL 생성")
    print("=" * 60)
    
    # 클라이언트 생성
    old_client: Client = create_client(OLD_PROJECT_URL, OLD_PROJECT_KEY)
    
    all_sql = []
    
    # 각 테이블 순서대로 처리
    for table in TABLES_ORDER:
        print(f"\n[{table}] 테이블 처리 중...")
        
        # 원래 프로젝트에서 데이터 조회
        data = get_table_data(old_client, table)
        
        if not data:
            print(f"  ⚠️  마이그레이션할 데이터가 없습니다.")
            continue
        
        print(f"  📊 {len(data)}개의 레코드 발견")
        
        # 배치로 나누어 SQL 생성
        batch_size = 100
        for i in range(0, len(data), batch_size):
            batch = data[i:i + batch_size]
            sql = generate_insert_sql(table, batch)
            all_sql.append({
                'table': table,
                'batch': i // batch_size + 1,
                'total_batches': (len(data) + batch_size - 1) // batch_size,
                'count': len(batch),
                'sql': sql
            })
            print(f"  💾 배치 {i//batch_size + 1}/{(len(data) + batch_size - 1)//batch_size} SQL 생성 완료 ({len(batch)}개 레코드)")
    
    print("\n" + "=" * 60)
    print("SQL 생성 완료")
    print("=" * 60)
    print(f"\n총 {len(all_sql)}개의 배치 SQL이 생성되었습니다.")
    print("\n생성된 SQL을 파일로 저장합니다...")
    
    # SQL 파일로 저장
    for item in all_sql:
        filename = f"migrate_{item['table']}_batch_{item['batch']}.sql"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"-- {item['table']} 테이블 배치 {item['batch']}/{item['total_batches']} 마이그레이션 SQL\n")
            f.write(f"-- 총 {item['count']}개 레코드\n\n")
            f.write(item['sql'])
        print(f"  ✅ {filename} 저장 완료")
    
    print("\n" + "=" * 60)
    print("완료!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n작업이 중단되었습니다.")
    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        traceback.print_exc()

