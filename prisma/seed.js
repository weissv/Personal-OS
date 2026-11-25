/**
 * MEZON SPRINT OS — seed.
 *
 * Прежняя версия этого файла содержала пароли пользователей в открытом виде.
 * Теперь seed делегирует безопасному bootstrap-скрипту: пароли генерируются
 * криптостойко (или берутся из ADMIN_INITIAL_PASSWORD / SEED_DEFAULT_PASSWORD)
 * и никогда не хранятся в репозитории. Выдать ученикам доступы:
 *   npm run credentials:generate
 */
require('../scripts/ensure-admin.js');
