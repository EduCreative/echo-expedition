/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useMemo, useEffect } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import useStore from '../lib/store';
import { goToDashboard, suspendUser, deleteUser, resetUserProgress, fetchAllUsersForAdmin, addToast } from '../lib/actions';
import c from 'clsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

function AdminAnalytics({ users }) {
  const isDark = document.documentElement.className.includes('dark');
  const textColor = isDark ? 'rgba(232, 234, 237, 0.8)' : 'rgba(32, 33, 36, 0.8)';
  const gridColor = isDark ? 'rgba(232, 234, 237, 0.1)' : 'rgba(32, 33, 36, 0.1)';

  const chartData = useMemo(() => {
    // Registrations Chart Data
    const monthLabels = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toLocaleString('default', { month: 'short' });
    }).reverse();
    const monthlyRegistrations = new Array(12).fill(0);
    const now = new Date();
    
    users.forEach(user => {
      if (!user.registrationDate) return;
      const regDate = new Date(user.registrationDate);
      const monthsAgo = (now.getFullYear() - regDate.getFullYear()) * 12 + (now.getMonth() - regDate.getMonth());
      if (monthsAgo >= 0 && monthsAgo < 12) {
        monthlyRegistrations[11 - monthsAgo]++;
      }
    });

    const registrationsData = {
      labels: monthLabels,
      datasets: [{
        label: 'New Users',
        data: monthlyRegistrations,
        borderColor: 'rgb(66, 133, 244)',
        backgroundColor: 'rgba(66, 133, 244, 0.2)',
        fill: true,
        tension: 0.3,
      }]
    };

    // Lessons Distribution Data is no longer easily calculable here, would require fetching all progress docs.
    // For simplicity, we will remove this chart.

    // User Status Data
    const statusCounts = users.reduce((acc, user) => {
      const status = user.status || 'active';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const statusData = {
      labels: ['Active', 'Suspended'],
      datasets: [{
        label: 'User Status',
        data: [statusCounts.active || 0, statusCounts.suspended || 0],
        backgroundColor: ['rgba(52, 168, 83, 0.7)', 'rgba(234, 67, 53, 0.7)'],
        borderColor: ['rgb(52, 168, 83)', 'rgb(234, 67, 53)'],
        borderWidth: 1,
      }]
    };

    return { registrationsData, statusData };
  }, [users]);

  const getCommonOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: textColor },
      },
      title: {
        display: true,
        text: title,
        color: textColor,
        font: { size: 16 },
      },
    },
    scales: {
      y: {
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
      x: {
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
    },
  });

  return (
    <section className="admin-analytics-section">
        <h3>Analytics Overview</h3>
        <div className="admin-charts-grid">
            <div className="chart-container-wrapper">
                <Line options={getCommonOptions('User Registrations (Last 12 Months)')} data={chartData.registrationsData} />
            </div>
            <div className="chart-container-wrapper">
                <Doughnut options={{...getCommonOptions('User Status'), scales: {}}} data={chartData.statusData} />
            </div>
        </div>
    </section>
  );
}


export default function AdminPanel() {
  const { user, isOnline } = useStore();
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Ensure only the designated admin can see this panel
  if (user?.email !== 'kmasroor50@gmail.com') {
    goToDashboard();
    return null;
  }
  
  const refreshUsers = async () => {
      if (!isOnline) {
        addToast({ title: 'Offline', message: 'User data cannot be fetched while offline.', icon: 'wifi_off' });
        setIsLoading(false);
        setAllUsers([]); // Clear data when offline
        return;
      }
      setIsLoading(true);
      try {
        const users = await fetchAllUsersForAdmin();
        setAllUsers(users);
      } catch (error) {
        console.error("Failed to fetch admin user list:", error);
        addToast({ title: 'Error', message: 'Could not fetch user data.', icon: 'error' });
        setAllUsers([]);
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    refreshUsers();
  }, [isOnline]);

  const filteredUsers = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    return allUsers.filter(u => 
      u.name?.toLowerCase().includes(lowercasedFilter) || 
      u.email?.toLowerCase().includes(lowercasedFilter)
    );
  }, [allUsers, searchTerm]);

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2>Admin Panel</h2>
        <div className="admin-controls">
          <input
            type="search"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {isLoading ? <div className="loader"><span className="icon">hourglass_top</span> Fetching user data...</div> : <AdminAnalytics users={allUsers} />}

      <div className="table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Registered</th>
              <th>Last Login</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.name || 'Anonymous'}</td>
                <td>{u.email || 'N/A'}</td>
                <td>{formatDate(u.registrationDate)}</td>
                <td>{formatDate(u.lastLogin)}</td>
                <td>
                  <span className={c('status-badge', u.status)}>
                    {u.status}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className="icon-button suspend"
                      title={u.status === 'active' ? 'Suspend User' : 'Unsuspend User'}
                      onClick={async () => { await suspendUser(u.id, u.status); refreshUsers(); }}
                    >
                      <span className="icon">{u.status === 'active' ? 'pause_circle' : 'play_circle'}</span>
                    </button>
                    <button 
                      className="icon-button reset" 
                      title="Reset User Progress"
                      onClick={async () => { await resetUserProgress(u.id, u.name); refreshUsers(); }}
                    >
                        <span className="icon">restart_alt</span>
                    </button>
                    <button
                      className="icon-button delete"
                      title="Delete User"
                      onClick={async () => { await deleteUser(u.id, u.name); refreshUsers(); }}
                    >
                      <span className="icon">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
       <button className="button back-to-dashboard" onClick={goToDashboard} style={{marginTop: '24px'}}>
        <span className="icon">arrow_back</span> Back to Dashboard
      </button>
    </div>
  );
}