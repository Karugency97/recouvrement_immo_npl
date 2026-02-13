import type { EndpointConfig } from '@directus/extensions';

const endpoint: EndpointConfig = (router, { services, getSchema, database }) => {
  // Client stats
  router.get('/client/:syndicId', async (req, res) => {
    try {
      const { syndicId } = req.params;
      const closedStatuses = ['cloture', 'paye', 'irrecovrable'];

      const activeStats = await database('dossiers')
        .where('syndic_id', syndicId)
        .whereNotIn('statut', closedStatuses)
        .count('* as count')
        .sum('montant_initial as total_initial')
        .sum('montant_recouvre as total_recouvre')
        .first();

      const closedCount = await database('dossiers')
        .where('syndic_id', syndicId)
        .whereIn('statut', ['cloture', 'paye'])
        .count('* as count')
        .first();

      const totalRecouvre = await database('dossiers')
        .where('syndic_id', syndicId)
        .sum('montant_recouvre as total')
        .first();

      res.json({
        dossiersActifs: Number(activeStats?.count) || 0,
        montantARecouvrer: (Number(activeStats?.total_initial) || 0) - (Number(activeStats?.total_recouvre) || 0),
        montantRecouvre: Number(totalRecouvre?.total) || 0,
        dossiersClotures: Number(closedCount?.count) || 0,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch client stats' });
    }
  });

  // Admin stats
  router.get('/admin', async (req, res) => {
    try {
      const closedStatuses = ['cloture', 'paye', 'irrecovrable'];

      const activeStats = await database('dossiers')
        .whereNotIn('statut', closedStatuses)
        .count('* as count')
        .sum('montant_initial as total_initial')
        .sum('montant_recouvre as total_recouvre')
        .first();

      const closedCount = await database('dossiers')
        .whereIn('statut', ['cloture', 'paye'])
        .count('* as count')
        .first();

      const totalRecouvre = await database('dossiers')
        .sum('montant_recouvre as total')
        .first();

      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const urgentTasks = await database('taches')
        .where('date_echeance', '<=', in7Days.toISOString())
        .where('date_echeance', '>=', now.toISOString())
        .whereNot('statut', 'terminee')
        .whereNot('statut', 'annulee')
        .count('* as count')
        .first();

      const unreadMessages = await database('messages')
        .where('lu', false)
        .count('* as count')
        .first();

      res.json({
        dossiersActifs: Number(activeStats?.count) || 0,
        montantARecouvrer: (Number(activeStats?.total_initial) || 0) - (Number(activeStats?.total_recouvre) || 0),
        montantRecouvre: Number(totalRecouvre?.total) || 0,
        dossiersClotures: Number(closedCount?.count) || 0,
        tachesUrgentes: Number(urgentTasks?.count) || 0,
        messagesNonLus: Number(unreadMessages?.count) || 0,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });
};

export default endpoint;
