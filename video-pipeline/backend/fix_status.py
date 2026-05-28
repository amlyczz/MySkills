import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DB_URL = 'postgresql+asyncpg://lms:lms_dev_2024@localhost:5432/localmodelstudio'

TASK_ID = 'b48a6271-c731-4dc1-ab18-2019ae215b56'

async def main():
    engine = create_async_engine(DB_URL)

    # Find the specific task
    async with engine.connect() as conn:
        result = await conn.execute(text(
            f"SELECT id, status, current_node, completed_nodes, failed_node, node_error, updated_at FROM pipeline_tasks WHERE id = '{TASK_ID}'"
        ))
        rows = result.fetchall()
        keys = result.keys()
        if rows:
            task = dict(zip(keys, rows[0]))
            print(f'Task found:')
            print(f'  ID: {task["id"]}')
            print(f'  Status: {task["status"]}')
            print(f'  Current node: {task["current_node"]}')
            print(f'  Completed nodes: {task["completed_nodes"]}')
            print(f'  Failed node: {task["failed_node"]}')
            print(f'  Error: {task["node_error"]}')
            print(f'  Updated: {task["updated_at"]}')
        else:
            print(f'Task {TASK_ID} NOT FOUND!')
            print('\nAll tasks:')
            result2 = await conn.execute(text(
                'SELECT id, status, updated_at FROM pipeline_tasks ORDER BY updated_at DESC'
            ))
            for row in result2.fetchall():
                print(f'  {row[0]} | {row[1]} | {row[2]}')

asyncio.run(main())
