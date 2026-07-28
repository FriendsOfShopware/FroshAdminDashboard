<?php declare(strict_types=1);

namespace Frosh\AdminDashboard;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Plugin;
use Shopware\Core\Framework\Plugin\Context\UninstallContext;

class FroshAdminDashboard extends Plugin
{
    /**
     * Config key used by the administration layout service
     * (see src/Resources/app/administration/src/core/dashboard-layout.service.ts).
     */
    public const USER_CONFIG_KEY_LAYOUT = 'frosh-admin-dashboard.layout';

    /**
     * Prefix for all user_config keys owned by this plugin.
     */
    public const USER_CONFIG_KEY_PREFIX = 'frosh-admin-dashboard.%';

    public function uninstall(UninstallContext $uninstallContext): void
    {
        parent::uninstall($uninstallContext);

        if ($uninstallContext->keepUserData()) {
            return;
        }

        $this->removeUserConfig();
    }

    private function removeUserConfig(): void
    {
        $connection = $this->container?->get(Connection::class);
        if (!$connection instanceof Connection) {
            return;
        }

        // Layout (and any future keys under the same prefix) live in user_config.
        $connection->executeStatement(
            'DELETE FROM user_config WHERE `key` LIKE :prefix',
            ['prefix' => self::USER_CONFIG_KEY_PREFIX],
        );
    }
}
