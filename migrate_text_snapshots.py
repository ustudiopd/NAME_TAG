#!/usr/bin/env python3
"""
text_object_snapshots 테이블만 마이그레이션
"""

from supabase import create_client, Client
import json

# 원래 프로젝트 정보
OLD_PROJECT_URL = "https://ekmuddykdzebbxmgigif.supabase.co"
OLD_PROJECT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbXVkZHlrZHplYmJ4bWdpZ2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Mzg0MzUsImV4cCI6MjA3MzMxNDQzNX0.cIa1NMV8OtETBphAxg2s72o7jUKCdZhUxDVpNr5XNo0"

def get_table_data(client: Client, table: str):
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
            escaped = value.replace("'", "''")
            return f"'{escaped}'"
        else:
            escaped = value.replace("'", "''")
            return f"'{escaped}'"
    elif isinstance(value, dict) or isinstance(value, list):
        json_str = json.dumps(value, ensure_ascii=False)
        escaped = json_str.replace("'", "''")
        return f"'{escaped}'"
    else:
        escaped = str(value).replace("'", "''")
        return f"'{escaped}'"

def generate_insert_sql(data):
    """데이터를 SQL INSERT 문으로 변환"""
    if not data:
        return ""
    
    columns = list(data[0].keys())
    columns_str = ', '.join(columns)
    
    json_columns = ['company_layout', 'name_layout', 'title_layout', 'full_state']
    
    values_list = []
    for row in data:
        values = []
        for col in columns:
            is_json = col in json_columns
            values.append(format_sql_value(row.get(col), is_json=is_json))
        values_list.append(f"({', '.join(values)})")
    
    sql = f"INSERT INTO nametag.text_object_snapshots ({columns_str})\nVALUES\n"
    sql += ",\n".join(values_list)
    sql += "\nON CONFLICT (id) DO NOTHING;"
    
    return sql

def main():
    print("=" * 60)
    print("text_object_snapshots 테이블 마이그레이션")
    print("=" * 60)
    
    old_client = create_client(OLD_PROJECT_URL, OLD_PROJECT_KEY)
    
    print("\n[text_object_snapshots] 데이터 조회 중...")
    data = get_table_data(old_client, 'text_object_snapshots')
    
    if not data:
        print("  ⚠️  마이그레이션할 데이터가 없습니다.")
        return
    
    print(f"  📊 {len(data)}개의 레코드 발견")
    
    sql = generate_insert_sql(data)
    
    # SQL 파일로 저장
    filename = "migrate_text_object_snapshots_final.sql"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(f"-- text_object_snapshots 테이블 마이그레이션 SQL\n")
        f.write(f"-- 총 {len(data)}개 레코드\n\n")
        f.write(sql)
    
    print(f"  💾 SQL 파일 저장: {filename}")
    print("\n" + "=" * 60)
    print("SQL 생성 완료!")
    print("=" * 60)
    print(f"\n생성된 SQL을 MCP로 실행하세요.")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        traceback.print_exc()

