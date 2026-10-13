import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Folder,
  Shapes,
  Plug,
  Zap,
  Users,
  Settings,
  HelpCircle,
  Plus,
  Menu,
  X,
  LogOut,
  Shield,
  ArrowUpRight,
  Moon,
  Sun,
  ChevronDown,
  FolderPlus,
  MoreHorizontal,
  MessageSquare,
  ChevronsLeft,
  Search,
  Clock3,
} from 'lucide-react';
import { Logo, useData, Modal } from '../Common';
import { useAuth } from '../../auth/AuthProvider';
import { useTheme } from '../theme/ThemeProvider';
import { useEarthScene, EarthBackdrop } from '../EarthBackdrop';
import api from '../../lib/api';
import { toast } from 'sonner';
const manageRoutes = [
  ['/billing', 'Billing & usage', Zap],
  ['/team', 'Team members', Users],
  ['/settings', 'Settings', Settings],
  ['/templates', 'Templates', Shapes],
  ['/help', 'Help & documentation', HelpCircle],
];
export default function WorkspaceLayout() {
  const { user, logout, refresh } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data, error: billingError, reload: reloadBilling } = useData('/billing');
  const { data: folderData, reload: reloadFolders } = useData('/folders');
  const { data: projectData, reload: reloadProjects } = useData('/projects');
  const navigate = useNavigate(),
    location = useLocation();
  const scene = useEarthScene(user.id, theme);
  const preferenceKey = 'nebula-sidebar:' + user.id;
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(preferenceKey) === 'true');
  const [manageOpen, setManageOpen] = useState(false),
    [foldersOpen, setFoldersOpen] = useState(true),
    [recentsOpen, setRecentsOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false),
    [searchQuery, setSearchQuery] = useState(''),
    [searchResults, setSearchResults] = useState([]),
    [searchLoading, setSearchLoading] = useState(false),
    [searchError, setSearchError] = useState('');
  const [themeBusy, setThemeBusy] = useState(false);
  useEffect(() => {
    if (!data?.account.reserved) return;
    const timer = setInterval(reloadBilling, 6000);
    return () => clearInterval(timer);
  }, [data?.account.reserved]);
  const chat =
    location.pathname === '/projects' && new URLSearchParams(location.search).has('chat');
  const overview = ['/dashboard', '/projects'].includes(location.pathname) && !chat;
  const [folderDialog, setFolderDialog] = useState(null),
    [folderName, setFolderName] = useState(''),
    [folderBusy, setFolderBusy] = useState(false),
    [folderMenu, setFolderMenu] = useState(null),
    [deleteFolder, setDeleteFolder] = useState(null);
  const folders = folderData?.folders || [];
  const refreshNavigation = () => Promise.all([reloadFolders(), reloadProjects(), reloadBilling()]);
  function setSidebarCollapsed(value) {
    setCollapsed(value);
    localStorage.setItem(preferenceKey, String(value));
  }
  useEffect(() => {
    if (manageRoutes.some(([path]) => path === location.pathname) || location.pathname === '/admin')
      setManageOpen(true);
  }, [location.pathname]);
  function openSearch() {
    setSearchQuery('');
    setSearchOpen(true);
    setOpen(false);
  }
  useEffect(() => {
    const shortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  useEffect(() => {
    if (!searchOpen) return;
    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError('');
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(
          '/projects?search=' + encodeURIComponent(searchQuery.trim()),
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) setSearchResults(data.projects);
      } catch (error) {
        if (!controller.signal.aborted) setSearchError(error.message);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchOpen, searchQuery]);
  async function saveFolder(event) {
    event.preventDefault();
    if (folderBusy) return;
    setFolderBusy(true);
    try {
      if (folderDialog.id)
        await api.patch('/folders/' + folderDialog.id, { name: folderName.trim() });
      else await api.post('/folders', { name: folderName.trim() });
      setFolderDialog(null);
      setFoldersOpen(true);
      await refreshNavigation();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setFolderBusy(false);
    }
  }
  async function changeTheme(next) {
    if (next === theme || themeBusy) return;
    const previous = theme;
    setThemeBusy(true);
    setTheme(next);
    try {
      await api.patch('/user/me', { theme: next });
      await refresh();
    } catch (error) {
      setTheme(previous);
      toast.error(error.message);
    } finally {
      setThemeBusy(false);
    }
  }
  return (
    <div
      className={
        'workspace-layout ' +
        (chat ? 'workspace-chat ' : overview ? 'workspace-overview ' : 'workspace-secondary ') +
        (collapsed ? 'sidebar-is-collapsed' : '')
      }
    >
      <button
        className="mobile-menu icon-button"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu />
      </button>
      <aside
        className={'sidebar ' + (open ? 'sidebar-open' : '')}
        aria-label="Workspace navigation"
      >
        <div className="sidebar-logo">
          <div className="sidebar-wordmark">
            <Logo />
          </div>
          <button
            className="sidebar-collapse icon-button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setSidebarCollapsed(!collapsed)}
          >
            <ChevronsLeft
              size={17}
              strokeWidth={1.75}
              aria-hidden="true"
              className={
                collapsed ? 'sidebar-collapse-chevron points-right' : 'sidebar-collapse-chevron'
              }
            />
          </button>
          <button
            className="mobile-close icon-button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <div className="sidebar-scroll">
          <button
            className="new-project-button"
            aria-label="New project"
            title="New project"
            onClick={() => {
              navigate(
                '/projects?new=true' +
                  (new URLSearchParams(location.search).get('folderId')
                    ? '&folderId=' + new URLSearchParams(location.search).get('folderId')
                    : ''),
              );
              setOpen(false);
            }}
          >
            <Plus size={17} />
            <span className="nav-label">New project</span>
          </button>
          <nav className="primary-navigation">
            <button
              className="sidebar-search-button"
              aria-label="Search projects"
              title="Search projects (⌘K / Ctrl+K)"
              onClick={openSearch}
            >
              <Search size={17} />
              <span className="nav-label">Search</span>
              <kbd className="nav-label">⌘K</kbd>
            </button>
            <NavLink
              to="/integrations"
              aria-label="Connectors"
              title="Connectors"
              onClick={() => setOpen(false)}
            >
              <Plug size={17} />
              <span className="nav-label">Connectors</span>
            </NavLink>
            <NavLink
              to="/library"
              aria-label="Projects"
              title="Projects"
              aria-current={new URLSearchParams(location.search).get('folderId') ? false : 'page'}
              className={({ isActive }) =>
                isActive && !new URLSearchParams(location.search).get('folderId') ? 'active' : ''
              }
              onClick={() => setOpen(false)}
            >
              <MessageSquare size={17} />
              <span className="nav-label">Projects</span>
            </NavLink>
          </nav>
          <div className="folder-navigation-heading">
            <button
              className="sidebar-section-toggle"
              aria-label="Folders"
              aria-expanded={foldersOpen}
              onClick={() => {
                if (collapsed) setSidebarCollapsed(false);
                setFoldersOpen(collapsed || !foldersOpen);
              }}
            >
              <Folder size={15} />
              <span className="nav-label">Folders</span>
              <ChevronDown
                size={13}
                className={foldersOpen ? 'section-chevron open' : 'section-chevron'}
              />
            </button>
            <button
              className="icon-button folder-create"
              aria-label="Create folder"
              title="Create folder"
              onClick={() => {
                setFolderName('');
                setFolderDialog({});
              }}
            >
              <FolderPlus size={15} />
            </button>
          </div>
          {foldersOpen && (
            <div className="folder-navigation">
              {folders.map((folder) => (
                <div className="folder-nav-row" key={folder.id}>
                  <Link
                    to={'/library?folderId=' + folder.id}
                    aria-current={
                      new URLSearchParams(location.search).get('folderId') === folder.id
                        ? 'page'
                        : undefined
                    }
                    className={
                      new URLSearchParams(location.search).get('folderId') === folder.id
                        ? 'folder-selected'
                        : ''
                    }
                    onClick={() => setOpen(false)}
                  >
                    <Folder size={15} />
                    <span>{folder.name}</span>
                    <small>{folder.projectCount}</small>
                  </Link>
                  {folder.writable && (
                    <button
                      className="icon-button"
                      aria-label={'Actions for folder ' + folder.name}
                      onClick={() => setFolderMenu(folderMenu === folder.id ? null : folder.id)}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  )}
                  {folderMenu === folder.id && (
                    <div className="folder-actions">
                      <button
                        onClick={() => {
                          setFolderName(folder.name);
                          setFolderDialog(folder);
                          setFolderMenu(null);
                        }}
                      >
                        Rename folder
                      </button>
                      <button
                        onClick={() => {
                          setDeleteFolder(folder);
                          setFolderMenu(null);
                        }}
                      >
                        Delete folder
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="sidebar-recents">
            <button
              className="sidebar-section-toggle"
              aria-label="Recents"
              title="Recent projects"
              aria-expanded={recentsOpen}
              onClick={() => {
                if (collapsed) setSidebarCollapsed(false);
                setRecentsOpen(collapsed || !recentsOpen);
              }}
            >
              <Clock3 size={16} />
              <span className="nav-label">Recents</span>
              <ChevronDown
                size={13}
                className={recentsOpen ? 'section-chevron open' : 'section-chevron'}
              />
            </button>
            {recentsOpen && (
              <nav className="recent-projects">
                {!projectData?.projects.length && (
                  <p className="sidebar-empty">Your next project starts here.</p>
                )}
                {projectData?.projects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    to={'/projects?chat=' + project.id}
                    onClick={() => setOpen(false)}
                  >
                    <MessageSquare size={15} />
                    <span>{project.name}</span>
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <div className="sidebar-manage">
            <button
              className="sidebar-section-toggle"
              aria-label="Manage"
              title="Manage"
              aria-expanded={manageOpen}
              onClick={() => {
                if (collapsed) setSidebarCollapsed(false);
                setManageOpen(collapsed || !manageOpen);
              }}
            >
              <Settings size={16} />
              <span className="nav-label">Manage</span>
              <ChevronDown
                size={13}
                className={manageOpen ? 'section-chevron open' : 'section-chevron'}
              />
            </button>
            {manageOpen && (
              <nav className="manage-navigation">
                {manageRoutes.map(([path, label, Icon]) => (
                  <NavLink key={path} to={path} onClick={() => setOpen(false)}>
                    <Icon size={15} />
                    {label}
                  </NavLink>
                ))}
                {user.isAdmin && (
                  <NavLink to="/admin" onClick={() => setOpen(false)}>
                    <Shield size={15} />
                    Administration
                  </NavLink>
                )}
              </nav>
            )}
          </div>
        </div>
        <div className="sidebar-bottom">
          <div
            className="credit-box"
            aria-label="AI credits"
            title={
              data
                ? `${Math.max(0, data.account.balance - data.account.reserved)} available credits; ${data.account.reserved} reserved`
                : 'Available AI credits'
            }
          >
            <Link to="/billing" aria-label="View credits and usage" onClick={() => setOpen(false)}>
              <span>
                <Zap size={13} />
                <span className="credit-label">Credits</span>
              </span>
              <strong>
                {data
                  ? Math.max(0, data.account.balance - data.account.reserved).toLocaleString()
                  : '—'}
              </strong>
            </Link>
            {data?.account.reserved > 0 && <p>{data.account.reserved} reserved</p>}
            {billingError && (
              <button className="text-button" aria-label="Reload credits" onClick={reloadBilling}>
                Retry
              </button>
            )}
          </div>
          <div className="sidebar-user">
            <span className="user-avatar">{user.firstName?.[0]?.toUpperCase()}</span>
            <Link to="/settings" aria-label="Your profile" onClick={() => setOpen(false)}>
              <strong>{user.firstName}</strong>
              <small>{user.email}</small>
            </Link>
            <button
              className="icon-button"
              aria-label="Sign out"
              title="Sign out"
              onClick={async () => {
                try {
                  await logout();
                } catch (error) {
                  toast.error(error.message);
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="workspace-main">
        {!chat && <EarthBackdrop scene={scene} subdued={!overview} />}
        <div className="workspace-appearance" role="group" aria-label="Appearance">
          <button
            type="button"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            disabled={themeBusy}
            onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <div className="workspace-scroll">
          <Outlet context={{ folders, refreshNavigation }} />
        </div>
      </div>
      <Modal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Find your next tab"
        description="Search your projects by name, or jump back into something recent."
      >
        <label className="sidebar-search-input">
          <Search size={18} />
          <input
            autoFocus
            aria-label="Search your projects"
            placeholder="Search projects…"
            maxLength={80}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        <div className="sidebar-search-results" aria-live="polite">
          {searchLoading ? (
            <p>Finding your projects…</p>
          ) : searchError ? (
            <p role="alert">{searchError}</p>
          ) : !searchResults.length ? (
            <p>No projects found. Try another name.</p>
          ) : (
            searchResults.map((project) => (
              <Link
                key={project.id}
                to={'/projects?chat=' + project.id}
                onClick={() => setSearchOpen(false)}
              >
                <MessageSquare size={17} />
                <span>
                  <strong>{project.name}</strong>
                  <small>Edited {new Date(project.updatedAt).toLocaleDateString()}</small>
                </span>
                <ArrowUpRight size={15} />
              </Link>
            ))
          )}
        </div>
      </Modal>
      <Modal
        open={!!folderDialog}
        onOpenChange={(value) => !value && setFolderDialog(null)}
        title={folderDialog?.id ? 'Rename folder' : 'Create folder'}
      >
        <form className="form-stack" onSubmit={saveFolder}>
          <label>
            Folder name
            <input
              autoFocus
              required
              maxLength={80}
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={folderBusy}>
            {folderBusy ? 'Saving…' : folderDialog?.id ? 'Save folder name' : 'Create folder'}
          </button>
        </form>
      </Modal>
      <Modal
        open={!!deleteFolder}
        onOpenChange={(value) => !value && setDeleteFolder(null)}
        title="Delete folder?"
        description="Your projects will stay saved and move to All projects."
      >
        <button
          className="danger-button"
          onClick={async () => {
            try {
              await api.delete('/folders/' + deleteFolder.id, {
                data: { confirmation: 'DELETE FOLDER' },
              });
              if (new URLSearchParams(location.search).get('folderId') === deleteFolder.id)
                navigate('/library');
              setDeleteFolder(null);
              await refreshNavigation();
              toast.success('Folder deleted. Projects kept.');
            } catch (error) {
              toast.error(error.message);
            }
          }}
        >
          Delete folder {deleteFolder?.name}
        </button>
      </Modal>
    </div>
  );
}
