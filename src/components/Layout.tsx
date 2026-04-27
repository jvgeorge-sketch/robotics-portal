import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <Sidebar />
      <TopBar />
      <main className="md:pl-64 pt-16 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
