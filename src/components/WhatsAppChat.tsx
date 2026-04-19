import React, { useState } from 'react';
import { 
  MessageSquare, 
  Search, 
  Paperclip, 
  Smile, 
  Send, 
  MoreVertical, 
  Phone, 
  Video, 
  Check, 
  CheckCheck, 
  Clock, 
  Bot, 
  Zap, 
  User, 
  Calendar, 
  FileText, 
  AlertTriangle 
} from 'lucide-react';

const WhatsAppChat: React.FC = () => {
  const [activeChat, setActiveChat] = useState<number | null>(1);
  const [messageInput, setMessageInput] = useState('');

  const chats = [
    { id: 1, name: 'Ahmad Ali', lastMsg: 'Boleh confirm booking esok?', time: '10:30 AM', unread: 2, status: 'online', type: 'booking' },
    { id: 2, name: 'Siti Sarah', lastMsg: 'Terima kasih atas servis.', time: 'Yesterday', unread: 0, status: 'offline', type: 'feedback' },
    { id: 3, name: 'Tan Wei Ming', lastMsg: 'Harga untuk 3 unit berapa?', time: 'Yesterday', unread: 0, status: 'offline', type: 'inquiry' },
  ];

  const messages = [
    { id: 1, sender: 'user', text: 'Salam, saya nak tanya harga servis aircond.', time: '10:00 AM', status: 'read' },
    { id: 2, sender: 'ai', text: 'Waalaikumussalam Tuan Ahmad. Untuk servis aircond wall unit biasa, harga bermula dari RM120 seunit. Tuan ada berapa unit?', time: '10:01 AM', status: 'read' },
    { id: 3, sender: 'user', text: 'Saya ada 2 unit 1.0HP. Kalau esok pagi ada slot?', time: '10:05 AM', status: 'read' },
    { id: 4, sender: 'ai', text: 'Baik Tuan. Untuk esok pagi (9:00 AM - 12:00 PM), kami masih ada kekosongan untuk Team A. Boleh saya proceed booking?', time: '10:06 AM', status: 'delivered' },
  ];

  return (
    <div className="flex h-[calc(100vh-140px)] bg-[#1E1E1E] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
      
      {/* A. Sidebar Kiri (Chat List) */}
      <div className="w-80 border-r border-white/5 flex flex-col bg-[#121212]">
        <div className="p-4 border-b border-white/5 bg-[#1E1E1E]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-lg">Chats</h3>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400"><MessageSquare size={18} /></button>
              <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400"><MoreVertical size={18} /></button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search or start new chat" 
              className="w-full bg-[#2C2C2C] border border-white/5 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#00BCD4] transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {chats.map((chat) => (
            <div 
              key={chat.id} 
              onClick={() => setActiveChat(chat.id)}
              className={`flex items-start gap-3 p-4 border-b border-white/5 cursor-pointer transition-colors ${activeChat === chat.id ? 'bg-[#2C2C2C] border-l-4 border-[#00BCD4]' : 'hover:bg-white/5'}`}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-white font-bold text-lg">
                  {chat.name.charAt(0)}
                </div>
                {chat.status === 'online' && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#121212] rounded-full"></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className={`font-semibold text-sm truncate ${activeChat === chat.id ? 'text-white' : 'text-gray-300'}`}>{chat.name}</h4>
                  <span className={`text-[10px] ${chat.unread > 0 ? 'text-[#00BCD4] font-bold' : 'text-gray-500'}`}>{chat.time}</span>
                </div>
                <p className="text-xs text-gray-400 truncate">{chat.lastMsg}</p>
                <div className="flex items-center gap-2 mt-2">
                  {chat.type === 'booking' && <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider">Booking</span>}
                  {chat.type === 'inquiry' && <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 font-bold uppercase tracking-wider">Inquiry</span>}
                  {chat.unread > 0 && (
                    <span className="ml-auto bg-[#00BCD4] text-[#121212] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* B. Panel Tengah (Chat Conversation) */}
      <div className="flex-1 flex flex-col bg-[#0F172A] relative">
        {/* Chat Header */}
        <div className="h-16 bg-[#1E1E1E] border-b border-white/5 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-white font-bold">
              A
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Ahmad Ali</h3>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <button className="hover:text-white transition-colors"><Phone size={20} /></button>
            <button className="hover:text-white transition-colors"><Video size={20} /></button>
            <button className="hover:text-white transition-colors"><Search size={20} /></button>
            <button className="hover:text-white transition-colors"><MoreVertical size={20} /></button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-[length:400px]">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm relative group ${
                msg.sender === 'user' 
                  ? 'bg-[#1E1E1E] text-white rounded-tl-none border border-white/5' 
                  : 'bg-[#005c4b] text-white rounded-tr-none shadow-md'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                  <span className="text-[10px]">{msg.time}</span>
                  {msg.sender === 'ai' && (
                    <span>
                      {msg.status === 'read' ? <CheckCheck size={14} className="text-[#53bdeb]" /> : <Check size={14} />}
                    </span>
                  )}
                </div>
                {msg.sender === 'ai' && (
                  <div className="absolute -left-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Bot size={20} className="text-[#00BCD4]" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#1E1E1E] border-t border-white/5">
          <div className="flex items-center gap-3 bg-[#2C2C2C] rounded-xl px-4 py-2 border border-white/5">
            <button className="text-gray-400 hover:text-white transition-colors"><Smile size={24} /></button>
            <button className="text-gray-400 hover:text-white transition-colors"><Paperclip size={24} /></button>
            <input 
              type="text" 
              placeholder="Type a message" 
              className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none py-2"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
            />
            <button className={`p-2 rounded-lg transition-all ${messageInput.trim() ? 'bg-[#00BCD4] text-[#121212] hover:bg-[#00ACC1]' : 'text-gray-500'}`}>
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* C. Panel Kanan (AI Engine Control) */}
      <div className="w-80 border-l border-white/5 bg-[#121212] flex flex-col">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-bold text-white text-lg mb-1 flex items-center gap-2">
            <Bot className="text-[#00BCD4]" size={20} /> AI Control
          </h3>
          <p className="text-xs text-gray-500">Manage AI behavior for this chat</p>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
          
          {/* AI Status Toggle */}
          <div className="bg-[#1E1E1E] p-4 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-white">AI Auto Reply</span>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#00BCD4] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00BCD4]"></div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#00BCD4]/10 text-[#00BCD4] border border-[#00BCD4]/20 hover:bg-[#00BCD4]/20 transition-colors">
                Professional
              </button>
              <button className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#121212] text-gray-400 border border-white/10 hover:text-white transition-colors">
                Friendly
              </button>
            </div>
          </div>

          {/* Booking Actions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Booking Actions</h4>
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-[#1E1E1E] hover:bg-[#2C2C2C] border border-white/5 rounded-xl text-left transition-all group">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:bg-emerald-500/20">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Create Booking</p>
                <p className="text-[10px] text-gray-500">Open booking form</p>
              </div>
            </button>
            
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-[#1E1E1E] hover:bg-[#2C2C2C] border border-white/5 rounded-xl text-left transition-all group">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500/20">
                <FileText size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Generate Invoice</p>
                <p className="text-[10px] text-gray-500">Create PDF invoice</p>
              </div>
            </button>
          </div>

          {/* Complain Actions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Support Actions</h4>
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-[#1E1E1E] hover:bg-[#2C2C2C] border border-white/5 rounded-xl text-left transition-all group">
              <div className="p-2 bg-red-500/10 rounded-lg text-red-400 group-hover:bg-red-500/20">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Open Ticket</p>
                <p className="text-[10px] text-gray-500">Flag as complaint</p>
              </div>
            </button>
          </div>

          {/* User Info */}
          <div className="bg-[#1E1E1E] p-4 rounded-xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Name</span>
                <span className="text-xs font-bold text-white">Ahmad Ali</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Phone</span>
                <span className="text-xs font-bold text-white">+60 12-345 6789</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Location</span>
                <span className="text-xs font-bold text-white">Johor Bahru</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Tags</span>
                <div className="flex gap-1">
                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] rounded font-bold uppercase">VIP</span>
                  <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] rounded font-bold uppercase">New</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default WhatsAppChat;
