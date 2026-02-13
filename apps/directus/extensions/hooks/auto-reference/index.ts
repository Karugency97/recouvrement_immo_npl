import type { HookConfig } from '@directus/extensions';

const hook: HookConfig = ({ filter }, { database, logger }) => {
  filter('dossiers.items.create', async (payload) => {
    const year = new Date().getFullYear();
    const prefix = `LR-${year}-`;

    // Use transaction for concurrency safety
    const result = await database.transaction(async (trx) => {
      const count = await trx('dossiers')
        .where('reference', 'like', `${prefix}%`)
        .count('* as total')
        .first();

      const next = String(((count?.total as number) || 0) + 1).padStart(3, '0');
      return `${prefix}${next}`;
    });

    payload.reference = result;
    logger.info(`Auto-reference generated: ${result}`);
    return payload;
  });
};

export default hook;
