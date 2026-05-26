import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProjectList from './pages/ProjectList'
import NewProject from './pages/NewProject'
import ProjectDetail from './pages/ProjectDetail'
import TaskMonitor from './pages/TaskMonitor'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
        <Route path="/project/:id/pipeline" element={<TaskMonitor />} />
        <Route path="/project/:id/task/:tid" element={<TaskMonitor />} />
      </Routes>
    </BrowserRouter>
  )
}
