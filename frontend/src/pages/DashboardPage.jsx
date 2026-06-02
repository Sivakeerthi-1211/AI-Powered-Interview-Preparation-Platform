import React, { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AppStateContext'
import { studentAPI, facultyAPI, adminAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import './DashboardPage.css'

function DashboardPage() {
  const { auth } = useAuth()
  const user = auth.user

  // Fetch dashboard data based on role
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', user?.role, user?.id],
    queryFn: async () => {
      if (user?.role === 'student') {
        return await studentAPI.getDashboard()
      } else if (user?.role === 'faculty') {
        return await facultyAPI.getDashboard()
      } else if (user?.role === 'admin') {
        return await adminAPI.getDashboard()
      }
      return null
    },
    enabled: !!user,
    retry: 1,
  })

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="error">
        Error loading dashboard: {error?.response?.data?.error || error.message || 'Unknown error'}
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <h1>Dashboard</h1>
      <div className="dashboard-content">
        {user?.role === 'student' && (
          <StudentDashboard data={data} user={user} />
        )}
        {(user?.role === 'faculty' || user?.role === 'admin') && (
          <FacultyAdminDashboard data={data} user={user} />
        )}
      </div>
    </div>
  )
}

function StudentDashboard({ data, user }) {
  return (
    <div className="student-dashboard">
      <h2>Welcome, {user?.username || 'Student'}!</h2>
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <h3>Placement Readiness</h3>
          <p className="score">{data?.placement_readiness_score || 'N/A'}</p>
        </div>
        <div className="dashboard-card">
          <h3>Total Questions Solved</h3>
          <p className="score">{data?.total_questions_solved || 0}</p>
        </div>
        <div className="dashboard-card">
          <h3>Interviews Completed</h3>
          <p className="score">{data?.interviews_completed || 0}</p>
        </div>
      </div>
    </div>
  )
}

function FacultyAdminDashboard({ data, user }) {
  return (
    <div className="faculty-admin-dashboard">
      <h2>Welcome, {user?.username || 'User'}!</h2>
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <h3>Total Students</h3>
          <p className="score">{data?.total_students || 0}</p>
        </div>
        <div className="dashboard-card">
          <h3>Active Interviews</h3>
          <p className="score">{data?.active_interviews || 0}</p>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
