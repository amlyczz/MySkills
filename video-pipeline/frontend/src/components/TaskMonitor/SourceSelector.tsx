import { useState } from 'react'
import { Flame, Link2, MessageSquare, Play } from 'lucide-react'

interface SourceSelectorProps {
  onSubmit: (url: string, type: 'trending' | 'url' | 'twitter') => void
}

export function SourceSelector({ onSubmit }: SourceSelectorProps) {
  const [activeTab, setActiveTab] = useState<'url' | 'trending' | 'twitter'>('trending')
  const [url, setUrl] = useState('')
  const [trendingInterest, setTrendingInterest] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (activeTab === 'trending') {
      onSubmit('trending', 'trending')
    } else {
      onSubmit(url, activeTab)
    }
  }

  return (
    <section className="paper p-3">
      <div className="grid grid-cols-3 gap-2 mb-2">
        {(
          [
            { tab: 'trending' as const, icon: Flame, title: 'GitHub Trending', desc: 'Fetch top repos from GitHub trending.', color: '#7C2D2D' },
            { tab: 'url' as const, icon: Link2, title: 'GitHub URL', desc: 'Input a GitHub repository link to analyze.', color: '#1E3A5F' },
            { tab: 'twitter' as const, icon: MessageSquare, title: 'Twitter URL', desc: 'Input a Twitter/X thread to extract insights.', color: '#1DA1F2' },
          ] as const
        ).map(({ tab, icon: Icon, title, desc, color }) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`relative p-2.5 rounded-md border-2 transition-all text-left ${
              activeTab === tab ? 'border-[#7C2D2D] bg-[#FBF1F1]' : 'border-[#E2DED6] bg-white hover:border-[#CCC7BD]'
            }`}>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded transition-colors"
                style={{ backgroundColor: activeTab === tab ? color : '#F5F2EB', color: activeTab === tab ? '#fff' : '#A8A29E' }}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className={`text-xs font-semibold ${activeTab === tab ? 'text-[#7C2D2D]' : 'text-[#1C1917]'}`}>{title}</span>
            </div>
            <p className="text-[10px] text-[#A8A29E] mt-1 line-clamp-1">{desc}</p>
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 bg-[#FAF9F6] rounded-md border border-[#E2DED6]">
        {activeTab === 'trending' ? (
          <>
            <Flame className="w-4 h-4 text-[#7C2D2D] shrink-0" />
            <input type="text" value={trendingInterest} onChange={e => setTrendingInterest(e.target.value)}
              placeholder="Optional topic (e.g. AI Agents, Web3)..."
              className="flex-1 min-w-0 bg-transparent text-xs focus:outline-none text-[#1C1917] placeholder:text-[#A8A29E]" />
            <button type="submit"
              className="bg-[#7C2D2D] text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#652424] transition-colors flex items-center gap-1">
              <Play className="w-3 h-3" /> Fetch
            </button>
          </>
        ) : activeTab === 'url' ? (
          <>
            <Link2 className="w-4 h-4 text-[#1E3A5F] shrink-0" />
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/owner/repo"
              className="flex-1 min-w-0 bg-transparent text-xs focus:outline-none text-[#1C1917] placeholder:text-[#A8A29E]" />
            <button type="submit" disabled={!url.trim()}
              className="bg-[#1E3A5F] text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#162D4A] disabled:opacity-30 transition-colors flex items-center gap-1">
              <Play className="w-3 h-3" /> Analyze
            </button>
          </>
        ) : (
          <>
            <MessageSquare className="w-4 h-4 text-[#1DA1F2] shrink-0" />
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://x.com/username/status/..."
              className="flex-1 min-w-0 bg-transparent text-xs focus:outline-none text-[#1C1917] placeholder:text-[#A8A29E]" />
            <button type="submit" disabled={!url.trim()}
              className="bg-[#1DA1F2] text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#1A91DA] disabled:opacity-30 transition-colors flex items-center gap-1">
              <Play className="w-3 h-3" /> Analyze
            </button>
          </>
        )}
      </form>
    </section>
  )
}
