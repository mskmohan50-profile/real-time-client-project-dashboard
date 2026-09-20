import { LayoutDashboard, FolderGit2, CheckSquare, Activity } from 'lucide-react';
import { UserRole } from '../types.ts';

interface NavigationProps {
  activeTab: 'dashboard' | 'projects' | 'tasks' | 'feed';
  onTabChange: (tab: 'dashboard' | 'projects' | 'tasks' | 'feed') => void;
  userRole?: UserRole;
  activityCount?: number;
}

export function Navigation({ activeTab, onTabChange, userRole, activityCount = 0 }: NavigationProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderGit2 },
    { id: 'tasks', label: userRole === 'DEVELOPER' ? 'My Assigned Tasks' : 'All Tasks', icon: CheckSquare },
    { id: 'feed', label: 'Live Activity Feed', icon: Activity, badge: activityCount > 0 ? activityCount : undefined },
  ];

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 no-scrollbar" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id as 'dashboard' | 'projects' | 'tasks' | 'feed')}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>

                {tab.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}