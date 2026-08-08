/**
 * Delete a planner run from the shared MySQL DB (occurrence + task).
 * Use when the VPS API does not yet have DELETE /recurring-tasks/tasks/:taskId
 * and board sync would rematerialize a PENDING run after task-only delete.
 *
 *   npx ts-node -r tsconfig-paths/register scripts/delete-planner-run.ts --taskId=<uuid>
 *   npx ts-node -r tsconfig-paths/register scripts/delete-planner-run.ts --title="Testing notifications" --sequence=1
 */
import * as path from 'path';
import { config as loadEnv } from 'dotenv';
import * as mysql from 'mysql2/promise';

loadEnv({ path: path.join(process.cwd(), '.env') });

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function uuidToBuf(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, '');
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error(`Invalid UUID: ${uuid}`);
  }
  return Buffer.from(hex, 'hex');
}

async function main() {
  const taskIdArg = arg('taskId');
  const title = arg('title');
  const sequence = arg('sequence');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME,
    password: (process.env.DB_PASSWORD || '').replace(/^"|"$/g, ''),
    database: process.env.DB_DATABASE,
  });

  try {
    let taskIds: Buffer[] = [];
    let occIds: Buffer[] = [];

    if (taskIdArg) {
      const taskBuf = uuidToBuf(taskIdArg);
      const [rows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT id, task_id FROM recurring_task_occurrences WHERE task_id = ?`,
        [taskBuf],
      );
      for (const row of rows) {
        if (row.id) occIds.push(row.id);
        if (row.task_id) taskIds.push(row.task_id);
      }
      taskIds.push(taskBuf);
    } else if (title) {
      const seq = sequence ? parseInt(sequence, 10) : undefined;
      const [rows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT o.id AS occ_id, o.task_id, o.sequence_number, t.title
         FROM recurring_task_occurrences o
         JOIN recurring_task_templates t ON t.id = o.template_id
         WHERE t.title LIKE ?
         ${seq != null && !Number.isNaN(seq) ? 'AND o.sequence_number = ?' : ''}
         ORDER BY o.sequence_number`,
        seq != null && !Number.isNaN(seq) ? [`%${title}%`, seq] : [`%${title}%`],
      );
      if (!rows.length) {
        console.error('No matching runs found.');
        process.exit(1);
      }
      for (const row of rows) {
        console.log(
          `match seq=${row.sequence_number} state row title=${row.title}`,
        );
        if (row.occ_id) occIds.push(row.occ_id);
        if (row.task_id) taskIds.push(row.task_id);
      }
    } else {
      console.error('Pass --taskId=<uuid> or --title="..." [--sequence=N]');
      process.exit(1);
    }

    // unique buffers
    const uniq = (list: Buffer[]) => {
      const seen = new Set<string>();
      return list.filter((b) => {
        const k = b.toString('hex');
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    };
    occIds = uniq(occIds);
    taskIds = uniq(taskIds);

    for (const oid of occIds) {
      await conn.query(`DELETE FROM recurring_task_occurrences WHERE id = ?`, [oid]);
      console.log(`deleted occurrence ${oid.toString('hex')}`);
    }
    for (const tid of taskIds) {
      await conn.query(`DELETE FROM task_attachments WHERE task_id = ?`, [tid]).catch(() => {});
      await conn.query(`DELETE FROM task_comments WHERE task_id = ?`, [tid]).catch(() => {});
      await conn.query(`DELETE FROM subtask_comments WHERE task_id = ?`, [tid]).catch(() => {});
      await conn.query(`UPDATE tasks SET parent_task_id = NULL WHERE parent_task_id = ?`, [tid]).catch(() => {});
      await conn.query(`DELETE FROM tasks WHERE id = ?`, [tid]);
      console.log(`deleted task ${tid.toString('hex')}`);
    }
    console.log('Done.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
