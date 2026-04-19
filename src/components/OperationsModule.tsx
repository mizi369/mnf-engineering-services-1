import React from 'react';
import { Users, Briefcase, Calendar, MapPin, Plus, MoreVertical, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const OperationsModule: React.FC = () => {
  const teams = [
    { id: 1, name: 'Team Alpha', leader: 'Zul Ariffin', members: 3, status: 'On Job', location: 'Taman Pelangi' },
    { id: 2, name: 'Team Bravo', leader: 'Samsul Bahri', members: 2, status: 'Idle', location: 'HQ' },
    { id: 3, name: 'Team Charlie', leader: 'Lim Guan Eng', members: 3, status: 'On Job', location: 'Bukit Indah' },
    { id: 4, name: 'Team Delta', leader: 'Ramasamy', members: 2, status: 'Maintenance', location: 'Workshop' },
  ];

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Operasi & Pasukan</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor field teams, schedules, and operational status.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            <span>Add New Team</span>
          </button>
          <button className="p-3 bg-[#1E1E1E] border border-white/5 rounded-lg text-gray-400 hover:text-[#00BCD4] transition-all">
            <Calendar size={20} />
          </button>
        </div>
      </div>

      {/* Team Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {teams.map((team) => (
          <div key={team.id} className="card-glow group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-lg bg-[#1A1A1A] border border-white/10 flex items-center justify-center text-[#00BCD4] group-hover:border-[#00BCD4]/50 transition-all">
                <Users size={24} />
              </div>
              <button className="text-gray-600 hover:text-white transition-colors">
                <MoreVertical size={18} />
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-black text-white tracking-tight group-hover:text-[#00BCD4] transition-colors">{team.name}</h3>
              <p className="text-xs text-gray-500 font-medium">Leader: {team.leader}</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Current Status</span>
                <span className={`font-bold uppercase tracking-tighter ${
                  team.status === 'On Job' ? 'text-emerald-400' : 
                  team.status === 'Idle' ? 'text-blue-400' : 'text-yellow-400'
                }`}>{team.status}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Location</span>
                <div className="flex items-center gap-1 text-gray-300">
                  <MapPin size={12} className="text-[#D32F2F]" />
                  <span>{team.location}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-[#1E1E1E] bg-gray-700 flex items-center justify-center text-[8px] font-bold text-white">
                    {i}
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-gray-500 font-bold uppercase">{team.members} Members</span>
            </div>
          </div>
        ))}
      </div>

      {/* Operational Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card-glow">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Clock className="text-[#00BCD4]" size={20} /> Today's Schedule
          </h3>
          <div className="space-y-6">
            {[
              { time: '09:00 AM', task: 'Servis Aircond - Pejabat Mara', team: 'Team Alpha', status: 'Completed' },
              { time: '11:30 AM', task: 'Wiring Check - Rumah Teres', team: 'Team Charlie', status: 'In Progress' },
              { time: '02:00 PM', task: 'Installation - Kondominium', team: 'Team Alpha', status: 'Pending' },
              { time: '04:30 PM', task: 'Maintenance - Kilang Sawit', team: 'Team Bravo', status: 'Pending' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-6 relative">
                {idx !== 3 && <div className="absolute left-[39px] top-10 bottom-[-24px] w-px bg-white/5"></div>}
                <div className="text-right w-20 pt-1">
                  <p className="text-xs font-bold text-white">{item.time}</p>
                </div>
                <div className="w-5 h-5 rounded-full bg-[#1A1A1A] border-2 border-white/10 flex items-center justify-center z-10">
                  <div className={`w-2 h-2 rounded-full ${
                    item.status === 'Completed' ? 'bg-emerald-500' : 
                    item.status === 'In Progress' ? 'bg-blue-500 animate-pulse' : 'bg-gray-700'
                  }`}></div>
                </div>
                <div className="flex-1 bg-[#121212]/50 p-4 rounded-xl border border-white/5 hover:border-[#00BCD4]/30 transition-all">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-bold text-white">{item.task}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : 
                      item.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-500'
                    }`}>{item.status}</span>
                  </div>
                  <p className="text-xs text-gray-500">Assigned to: <span className="text-[#00BCD4] font-bold">{item.team}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-glow">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="text-[#D32F2F]" size={20} /> Alerts & Issues
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                <p className="text-xs font-bold text-red-400 mb-1">Team Delta - Delayed</p>
                <p className="text-[10px] text-gray-500">Traffic congestion at Pasir Gudang Highway.</p>
              </div>
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                <p className="text-xs font-bold text-yellow-400 mb-1">Equipment Check</p>
                <p className="text-[10px] text-gray-500">Team Bravo needs new manifold gauge set.</p>
              </div>
            </div>
          </div>

          <div className="card-glow bg-gradient-to-br from-[#D32F2F]/10 to-transparent">
            <h3 className="text-lg font-bold text-white mb-2">Operational Health</h3>
            <p className="text-xs text-gray-500 mb-4">Current system performance across all teams.</p>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-black text-white">92%</div>
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="bg-[#D32F2F] h-full w-[92%]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsModule;
