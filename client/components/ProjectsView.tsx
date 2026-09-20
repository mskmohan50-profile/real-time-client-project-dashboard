import { useState } from 'react';
import { Plus, FolderKanban, CheckCircle2, AlertTriangle, ArrowRight, Building, UserCheck } from 'lucide-react';
import { Project, UserRole } from '../types.ts';

interface ProjectsViewProps {
  projects: Project[];
  userRole: UserRole;
  onSelectProject: (projectId: string) => void;
  onOpenCreateModal: () => void;
}

export function ProjectsView({
  projects,
  userRole,
  onSelectProject,
  onOpenCreateModal,
}: ProjectsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const canCreate = userRole === 'ADMIN' || userRole === 'PROJECT_MANAGER';

  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.client_name && p.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.client_company && p.client_company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Client Projects Portfolio</h2>
          <p className="text-xs text-slate-500">
            {userRole === 'ADMIN'
              ? 'Global Agency portfolio — full administrative governance.'
              : userRole === 'PROJECT_MANAGER'
              ? 'Your managed client projects portfolio.'
              : 'Projects containing your assigned sprint deliverables.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search projects or clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 w-48 sm:w-64"
          />

          {canCreate && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((project) => {
          const totalTasks = project.total_tasks || 0;
          const completedTasks = project.completed_tasks || 0;
          const overdueTasks = project.overdue_tasks || 0;
          const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          return (
            <div
              key={project.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {project.client_name || 'Client'}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{project.title}</h3>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 shrink-0">
                    {project.status}
                  </span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2">{project.description}</p>

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-slate-600 font-medium">
                    <span>Task Completion</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percent}%` }}
                      className={`h-full rounded-full transition-all ${
                        percent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Total</span>
                    <span className="text-xs font-bold text-slate-900">{totalTasks}</span>
                  </div>
                  <div className="p-2 bg-emerald-50/50 rounded-lg">
                    <span className="text-[10px] text-emerald-700 block">Done</span>
                    <span className="text-xs font-bold text-emerald-800">{completedTasks}</span>
                  </div>
                  <div className="p-2 bg-rose-50/50 rounded-lg">
                    <span className="text-[10px] text-rose-700 block">Overdue</span>
                    <span className="text-xs font-bold text-rose-800">{overdueTasks}</span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px] flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-slate-400" />
                  PM: {project.creator_name || 'PM'}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectProject(project.id)}
                  className="font-semibold text-slate-900 hover:text-blue-600 flex items-center gap-1 transition-colors"
                >
                  <span>Open Tasks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No Projects Found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or create a new project.</p>
        </div>
      )}
    </div>
  );
}
