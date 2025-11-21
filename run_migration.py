#!/usr/bin/env python3
"""
SQL 파일을 읽어서 각 배치를 순차적으로 실행
날짜 형식을 수정하여 실행
"""

import re

def fix_date_format(sql):
    """날짜 형식을 PostgreSQL 형식으로 수정"""
    # ISO 8601 형식 (2025-09-13T20:40:16.949205+00:00)을 PostgreSQL 형식으로 변환
    # 2025-09-13T20:40:16.949205+00:00 -> 2025-09-13 20:40:16.949205+00
    sql = re.sub(r"(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}\.\d+)\+00:00", r"\1 \2+00", sql)
    sql = re.sub(r"(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}\.\d+)\+00:00", r"\1 \2+00", sql)
    return sql

def extract_batches(sql_file):
    """SQL 파일에서 배치들을 추출"""
    with open(sql_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 배치 구분자로 분리
    batches = []
    current_batch = []
    in_batch = False
    
    for line in content.split('\n'):
        if line.strip().startswith('--') and '배치' in line:
            if current_batch:
                batches.append('\n'.join(current_batch))
            current_batch = [line]
            in_batch = True
        elif in_batch:
            current_batch.append(line)
            if line.strip().endswith(';'):
                in_batch = False
    
    if current_batch:
        batches.append('\n'.join(current_batch))
    
    return batches

def main():
    sql_file = "migrate_all_tables.sql"
    batches = extract_batches(sql_file)
    
    print(f"총 {len(batches)}개의 배치를 발견했습니다.")
    print("\n각 배치를 순차적으로 실행하세요:")
    print("=" * 60)
    
    for i, batch in enumerate(batches, 1):
        # 날짜 형식 수정
        fixed_batch = fix_date_format(batch)
        
        # 배치 정보 추출
        first_line = batch.split('\n')[0]
        print(f"\n배치 {i}: {first_line}")
        
        # SQL 파일로 저장
        output_file = f"migrate_batch_{i}.sql"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(fixed_batch)
        
        print(f"  ✅ {output_file} 파일로 저장됨")
        print(f"  📝 MCP로 실행: mcp_supabase_execute_sql(project_id='xiygbsaewuqocaxoxeqn', query=파일내용)")

if __name__ == "__main__":
    main()

