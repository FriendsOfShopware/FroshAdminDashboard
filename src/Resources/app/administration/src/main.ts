// Wire the dashboard core (registry + layout service) into the admin.
import './core/register';

// Register the built-in widgets and their registry entries.
import './widget';

// Register the dashboard module that replaces the core dashboard page.
import './module/frosh-admin-dashboard';
