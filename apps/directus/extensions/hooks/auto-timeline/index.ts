import type { HookConfig } from '@directus/extensions';

const hook: HookConfig = ({ action }, { services, getSchema, logger }) => {
  action('dossiers.items.update', async (meta, context) => {
    if (!meta.payload.statut) return;

    const { ItemsService } = services;
    const schema = await getSchema();

    // Get the previous status
    const dossiersService = new ItemsService('dossiers', {
      schema,
      accountability: context.accountability,
    });

    const dossier = await dossiersService.readOne(meta.keys[0], {
      fields: ['statut'],
    });

    // Note: at this point, dossier.statut is already the NEW value
    // The payload contains the new status
    const newStatus = meta.payload.statut;

    const eventsService = new ItemsService('evenements', {
      schema,
      accountability: context.accountability,
    });

    await eventsService.createOne({
      dossier_id: meta.keys[0],
      type: 'changement_statut',
      titre: `Changement de statut : ${newStatus}`,
      description: `Le statut du dossier a été mis à jour vers "${newStatus}".`,
      date_evenement: new Date().toISOString(),
      auteur_id: context.accountability?.user || null,
      visible_client: true,
      metadata: {
        nouveau_statut: newStatus,
      },
    });

    logger.info(`Timeline event created for dossier ${meta.keys[0]}: status -> ${newStatus}`);
  });
};

export default hook;
