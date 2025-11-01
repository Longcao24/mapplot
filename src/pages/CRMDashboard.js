import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CRMDashboard.css';
import { apiGetCustomers } from '../lib/api';
import MapModule from '../components/MapModule';
import { useTaskManager } from '../hooks/useTaskManager';
import { isAuthorized, listUpcomingEvents, isGapiInitialized } from '../services/googleCalendar';

const CRMDashboard = () => {
  const navigate = useNavigate();
  const { tasks } = useTaskManager();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    leads: 0,
    prospects: 0,
    customers: 0,
    recentlyAdded: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [activeCalendarTab, setActiveCalendarTab] = useState('tasks'); // 'tasks' or 'events'

  // Mock Stripe data (replace with real API calls in production)
  const stripeData = {
    totalRevenue: 127450,
    monthlyRevenue: 24680,
    revenueGrowth: 12.3,
    activeSubscriptions: 156,
    subscriptionGrowth: 8.5,
    mrr: 18950, // Monthly Recurring Revenue
    churnRate: 2.1,
    recentTransactions: [
      { id: 1, customer: 'Acme Corp', amount: 2499, plan: 'Enterprise', date: '2025-10-30', status: 'succeeded' },
      { id: 2, customer: 'TechStart Inc', amount: 999, plan: 'Professional', date: '2025-10-30', status: 'succeeded' },
      { id: 3, customer: 'Creative Labs', amount: 499, plan: 'Starter', date: '2025-10-29', status: 'succeeded' },
      { id: 4, customer: 'Digital Solutions', amount: 1499, plan: 'Business', date: '2025-10-29', status: 'succeeded' },
      { id: 5, customer: 'Innovation Hub', amount: 2499, plan: 'Enterprise', date: '2025-10-28', status: 'succeeded' }
    ],
    subscriptionBreakdown: [
      { plan: 'Enterprise', count: 45, revenue: 112455, color: '#635BFF' },
      { plan: 'Business', count: 68, revenue: 101932, color: '#0A2540' },
      { plan: 'Professional', count: 32, revenue: 31968, color: '#00D4FF' },
      { plan: 'Starter', count: 11, revenue: 5489, color: '#96F' }
    ]
  };

  // Fetch customer data for stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const customersData = await apiGetCustomers();
        
        const convertedCustomers = customersData.filter(customer => {
          return customer.name || customer.company;
        }).map(customer => ({
          id: customer.id,
          type: customer.customer_type || 'customer',
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          company: customer.company || customer.name,
          address: customer.address || '',
          city: customer.city || 'Unknown',
          state: customer.state || 'XX',
          zip_code: customer.postal_code || '',
          country: customer.country || 'USA',
          status: customer.status,
          certification: customer.role_background || '',
          registered_at: customer.registered_at || customer.created_at,
          latitude: customer.latitude,
          longitude: customer.longitude,
          products_interested: customer.products_interested ? 
            (Array.isArray(customer.products_interested) ? 
              customer.products_interested : 
              JSON.parse(customer.products_interested || '[]')
            ) : ['Unknown'],
          notes: customer.notes || '',
          last_interaction_date: customer.last_interaction_date,
          last_interaction_type: customer.last_interaction_type,
          next_follow_up_date: customer.next_follow_up_date,
          claimed_by: customer.claimed_by,
          source_system: customer.source_system
        }));

        setCustomers(convertedCustomers);

        // Calculate stats
        const leads = convertedCustomers.filter(c => c.status === 'lead').length;
        const prospects = convertedCustomers.filter(c => c.status === 'prospect').length;
        const activeCustomers = convertedCustomers.filter(c => c.status === 'customer').length;
        
        // Recently added (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recent = convertedCustomers.filter(c => {
          const registered = new Date(c.registered_at);
          return registered >= sevenDaysAgo;
        }).length;

        setStats({
          totalCustomers: convertedCustomers.length,
          leads,
          prospects,
          customers: activeCustomers,
          recentlyAdded: recent
        });

      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Load Google Calendar events and tasks
  useEffect(() => {
    const loadCalendarData = async () => {
      try {
        const connected = isAuthorized();
        setIsGoogleConnected(connected);
        
        if (connected && isGapiInitialized()) {
          const events = await listUpcomingEvents(10);
          setUpcomingEvents(events);
        }
      } catch (error) {
        console.error('Error loading calendar data:', error);
      }
    };
    loadCalendarData();
  }, []);

  // Get upcoming tasks (next 7 days)
  const getUpcomingTasks = () => {
    if (!tasks) return [];
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return tasks
      .filter(task => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        return dueDate >= today && dueDate <= nextWeek && task.status !== 'completed';
      })
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 5);
  };

  return (
    <div className="crm-dashboard-content">
      {/* Page Title and Filters */}
      <div className="crm-page-header">
        <div className="page-header-content">
          <div>
            <h1>Dashboard Summary</h1>
            <p>Refreshed UTC {new Date().toLocaleString()}</p>
          </div>
          <div className="page-filters">
            <select className="filter-dropdown">
              <option>Past 1 month</option>
              <option>Past 3 months</option>
              <option>Past 6 months</option>
              <option>Past year</option>
            </select>
            <select className="filter-dropdown">
              <option>All Products</option>
              <option>AudioSight</option>
              <option>SATE</option>
            </select>
            <select className="filter-dropdown">
              <option>All Channels</option>
              <option>Email</option>
              <option>Phone</option>
              <option>Web</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="crm-stats-section">
        <div className="stats-container">
          <div className="stat-card stat-total">
            <div className="stat-content">
              <h3>Total Customers</h3>
              <p className="stat-value">{loading ? '...' : stats.totalCustomers.toLocaleString()}</p>
              <div className="stat-change positive">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
                <span>17.7%</span>
              </div>
            </div>
          </div>

          <div className="stat-card stat-leads">
            <div className="stat-content">
              <h3>Leads</h3>
              <p className="stat-value">{loading ? '...' : stats.leads.toLocaleString()}</p>
              <div className="stat-change positive">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
                <span>5.9%</span>
              </div>
            </div>
          </div>

          <div className="stat-card stat-prospects">
            <div className="stat-content">
              <h3>Prospects</h3>
              <p className="stat-value">{loading ? '...' : stats.prospects.toLocaleString()}</p>
              <div className="stat-change negative">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                <span>-4.6%</span>
              </div>
            </div>
          </div>

          <div className="stat-card stat-customers">
            <div className="stat-content">
              <h3>Active Customers</h3>
              <p className="stat-value">{loading ? '...' : stats.customers.toLocaleString()}</p>
              <div className="stat-change positive">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
                <span>2.5%</span>
              </div>
            </div>
          </div>

          <div className="stat-card stat-recent">
            <div className="stat-content">
              <h3>Added This Week</h3>
              <p className="stat-value">{loading ? '...' : stats.recentlyAdded.toLocaleString()}</p>
              <div className="stat-change positive">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
                <span>9.4%</span>
              </div>
            </div>
          </div>

          <div className="stat-card stat-conversion">
            <div className="stat-content">
              <h3>Conversion Rate</h3>
              <p className="stat-value">
                {loading ? '...' : 
                  stats.totalCustomers > 0 
                    ? `${((stats.customers / stats.totalCustomers) * 100).toFixed(1)}%`
                    : '0%'
                }
              </p>
              <div className="stat-change neutral">
                <span>-0.4%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="crm-dashboard-grid">
        {/* Left Column */}
        <div className="dashboard-left-col">
          {/* Customer Growth Chart */}
          {/* <div className="dashboard-widget">
            <div className="widget-header">
              <h3>Customer Growth</h3>
              <button className="widget-menu-btn">⋯</button>
            </div>
            <div className="widget-content">
              <div className="chart-placeholder">
                <div className="bar-chart">
                  {[65, 45, 78, 52, 85, 48, 72, 58, 90, 55, 68, 75].map((height, i) => (
                    <div key={i} className="bar-chart-item">
                      <div className="bar-chart-bar" style={{ height: `${height}%` }}>
                        <div className="bar-chart-fill"></div>
                      </div>
                      <div className="bar-chart-label">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div> */}

          {/* Top Drivers Table */}
          <div className="dashboard-widget">
            <div className="widget-header">
              <h3>Customer Volume Drivers</h3>
              <button className="widget-menu-btn">⋯</button>
            </div>
            <div className="widget-content">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Volume</th>
                    <th>Total Cases</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Product inquiry</td>
                    <td>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: '68%' }}></div>
                      </div>
                      <span className="progress-label">68%</span>
                    </td>
                    <td>1,882</td>
                  </tr>
                  <tr>
                    <td>Pricing questions</td>
                    <td>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: '55%' }}></div>
                      </div>
                      <span className="progress-label">55%</span>
                    </td>
                    <td>1,597</td>
                  </tr>
                  <tr>
                    <td>Technical support</td>
                    <td>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: '45%' }}></div>
                      </div>
                      <span className="progress-label">45%</span>
                    </td>
                    <td>1,294</td>
                  </tr>
                  <tr>
                    <td>Demo request</td>
                    <td>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: '38%' }}></div>
                      </div>
                      <span className="progress-label">38%</span>
                    </td>
                    <td>1,060</td>
                  </tr>
                  <tr>
                    <td>Account setup</td>
                    <td>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: '32%' }}></div>
                      </div>
                      <span className="progress-label">32%</span>
                    </td>
                    <td>698</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Revenue Overview Widget */}
          <div className="dashboard-widget revenue-widget">
            <div className="widget-header">
              <div className="widget-title-with-icon">
                {/* <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg> */}
                <h3>Revenue Overview</h3>
              </div>
              {/* <span className="demo-badge">DEMO</span> */}
            </div>
            <div className="widget-content">
              {/* Revenue Summary Cards */}
              <div className="revenue-stats-grid">
                <div className="revenue-stat-card primary">
                  <div className="revenue-stat-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                  <div className="revenue-stat-content">
                    <div className="revenue-stat-label">Monthly Revenue</div>
                    <div className="revenue-stat-value">${(stripeData.monthlyRevenue / 100).toLocaleString()}</div>
                    <div className="revenue-stat-change positive">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="18 15 12 9 6 15"/>
                      </svg>
                      +{stripeData.revenueGrowth}% from last month
                    </div>
                  </div>
                </div>

                <div className="revenue-stat-card secondary">
                  <div className="revenue-stat-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="8" width="18" height="4" rx="1"/>
                      <path d="M12 8v13"/>
                      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
                    </svg>
                  </div>
                  <div className="revenue-stat-content">
                    <div className="revenue-stat-label">Active Subscriptions</div>
                    <div className="revenue-stat-value">{stripeData.activeSubscriptions}</div>
                    <div className="revenue-stat-change positive">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="18 15 12 9 6 15"/>
                      </svg>
                      +{stripeData.subscriptionGrowth}% growth
                    </div>
                  </div>
                </div>
              </div>

              {/* MRR and Churn */}
              <div className="revenue-metrics">
                <div className="revenue-metric-item">
                  <div className="revenue-metric-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    Monthly Recurring Revenue
                  </div>
                  <div className="revenue-metric-value">${(stripeData.mrr / 100).toLocaleString()}</div>
                </div>
                <div className="revenue-metric-item">
                  <div className="revenue-metric-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    Churn Rate
                  </div>
                  <div className="revenue-metric-value churn">{stripeData.churnRate}%</div>
                </div>
              </div>

              {/* Stripe Link */}
              <div className="revenue-footer">
                <a href="#" className="revenue-link" onClick={(e) => e.preventDefault()}>
                  <svg width="48" height="20" viewBox="0 0 60 25" fill="none">
                    <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z" fill="#3b82f6"/>
                  </svg>
                  <span>Powered by Stripe</span>
                </a>
              </div>
            </div>
          </div>

          {/* Subscription Plans & Transactions Widget */}
          <div className="dashboard-widget subscription-widget">
            <div className="widget-header">
              <h3>Subscriptions & Transactions</h3>
              <button className="widget-menu-btn">⋯</button>
            </div>
            <div className="widget-content">
              {/* Subscription Breakdown */}
              <div className="subscription-breakdown">
                <h4>Active Plans</h4>
                <div className="subscription-list">
                  {stripeData.subscriptionBreakdown.map((sub, idx) => (
                    <div key={idx} className="subscription-item">
                      <div className="subscription-info">
                        <div className="subscription-plan-indicator" style={{ background: sub.color }}></div>
                        <div className="subscription-details">
                          <div className="subscription-plan-name">{sub.plan}</div>
                          <div className="subscription-count">{sub.count} subscribers</div>
                        </div>
                      </div>
                      <div className="subscription-revenue">
                        ${(sub.revenue / 100).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="recent-transactions">
                <h4>Recent Transactions</h4>
                <div className="transactions-list">
                  {stripeData.recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="transaction-item">
                      <div className="transaction-left">
                        <div className="transaction-status success">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                        <div className="transaction-details">
                          <div className="transaction-customer">{transaction.customer}</div>
                          <div className="transaction-meta">
                            <span className="transaction-plan">{transaction.plan}</span>
                            <span className="transaction-date">{new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="transaction-amount">
                        ${(transaction.amount / 100).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="dashboard-right-col">
          {/* Status Distribution */}
          <div className="dashboard-widget">
            <div className="widget-header">
              <h3>Customer Status</h3>
              <button className="widget-menu-btn">⋯</button>
            </div>
            <div className="widget-content">
              <div className="donut-chart-container">
                <svg className="donut-chart" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#e5e7eb" strokeWidth="30"/>
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#f59e0b" strokeWidth="30" 
                          strokeDasharray="200 283" strokeDashoffset="0" transform="rotate(-90 60 60)"/>
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#3b82f6" strokeWidth="30" 
                          strokeDasharray="60 283" strokeDashoffset="-200" transform="rotate(-90 60 60)"/>
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#ef4444" strokeWidth="30" 
                          strokeDasharray="23 283" strokeDashoffset="-260" transform="rotate(-90 60 60)"/>
                  <text x="60" y="60" textAnchor="middle" dy="7" fontSize="24" fontWeight="700" fill="#111827">
                    {loading ? '...' : stats.totalCustomers.toLocaleString()}
                  </text>
                </svg>
                <div className="donut-legend">
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#f59e0b' }}></span>
                    <span className="legend-label">Leads</span>
                    <span className="legend-value">70.8%</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#3b82f6' }}></span>
                    <span className="legend-label">Prospects</span>
                    <span className="legend-value">21.2%</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#ef4444' }}></span>
                    <span className="legend-label">Customers</span>
                    <span className="legend-value">8.0%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Channel Performance */}
          <div className="dashboard-widget">
            <div className="widget-header">
              <h3>Channel Performance</h3>
              <button className="widget-menu-btn">⋯</button>
            </div>
            <div className="widget-content">
              <div className="stacked-bar-chart">
                {[
                  { name: 'Phone', active: 2400, canceled: 1400, resolved: 600 },
                  { name: 'Email', active: 3200, canceled: 1800, resolved: 1400 },
                  { name: 'Web', active: 2800, canceled: 1400, resolved: 800 },
                  { name: 'Social', active: 1600, canceled: 800, resolved: 400 }
                ].map((item, i) => (
                  <div key={i} className="stacked-bar-item">
                    <div className="stacked-bar-label">{item.name}</div>
                    <div className="stacked-bar">
                      <div className="stacked-segment" style={{ width: '40%', background: '#f59e0b' }} title={`Active: ${item.active}`}></div>
                      <div className="stacked-segment" style={{ width: '30%', background: '#ef4444' }} title={`Canceled: ${item.canceled}`}></div>
                      <div className="stacked-segment" style={{ width: '30%', background: '#10b981' }} title={`Resolved: ${item.resolved}`}></div>
                    </div>
                    <div className="stacked-bar-total">{(item.active + item.canceled + item.resolved).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div className="chart-legend-horizontal">
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#f59e0b' }}></span>
                  <span>Active</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#ef4444' }}></span>
                  <span>Canceled</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#10b981' }}></span>
                  <span>Resolved</span>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar & Upcoming Events Widget */}
          <div className="dashboard-widget calendar-widget">
            <div className="widget-header">
              <h3>📅 Upcoming Schedule</h3>
              <button 
                className="view-calendar-btn"
                onClick={() => navigate('/calendar')}
              >
                View Calendar →
              </button>
            </div>
            <div className="widget-content">
              {/* Tab Switcher */}
              <div className="calendar-tabs">
                <button 
                  className={`tab-btn ${activeCalendarTab === 'tasks' ? 'active' : ''}`}
                  onClick={() => setActiveCalendarTab('tasks')}
                >
                  Tasks
                  {getUpcomingTasks().length > 0 && (
                    <span className="tab-badge">{getUpcomingTasks().length}</span>
                  )}
                </button>
                <button 
                  className={`tab-btn ${activeCalendarTab === 'events' ? 'active' : ''}`}
                  onClick={() => setActiveCalendarTab('events')}
                >
                  Events
                  {upcomingEvents.length > 0 && (
                    <span className="tab-badge">{upcomingEvents.length}</span>
                  )}
                </button>
              </div>

              {/* Content based on active tab */}
              <div className="calendar-items-list">
                {/* Tasks Tab */}
                {activeCalendarTab === 'tasks' && (
                  <>
                    {getUpcomingTasks().length === 0 ? (
                      <div className="no-upcoming-items">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M9 11l3 3L22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                        <p>No upcoming tasks</p>
                        <button 
                          className="btn-secondary"
                          onClick={() => navigate('/tasks')}
                        >
                          Create Task
                        </button>
                      </div>
                    ) : (
                      getUpcomingTasks().map(task => {
                      const dueDate = new Date(task.due_date);
                      const isToday = dueDate.toDateString() === new Date().toDateString();
                      const isPast = dueDate < new Date();
                      
                      return (
                        <div key={task.id} className="calendar-item task-item">
                          <div className="item-left">
                            <div className={`item-indicator priority-${task.priority || 'none'}`}></div>
                            <div className="item-details">
                              <h5 className="item-title">{task.title}</h5>
                              <p className="item-meta">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                {isToday ? 'Today' : isPast ? 'Overdue' : dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <div className={`status-badge ${task.status}`}>
                            {task.status}
                          </div>
                        </div>
                      );
                    })
                    )}
                  </>
                )}

                {/* Events Tab */}
                {activeCalendarTab === 'events' && (
                  <>
                    {!isGoogleConnected ? (
                      <div className="no-upcoming-items">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <p>Google Calendar not connected</p>
                        <button 
                          className="btn-secondary"
                          onClick={() => navigate('/calendar')}
                        >
                          Connect Calendar
                        </button>
                      </div>
                    ) : upcomingEvents.length === 0 ? (
                      <div className="no-upcoming-items">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#4285F4" opacity="0.2"/>
                          <path d="M12 7V12L15 15" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <p>No upcoming events</p>
                        <button 
                          className="btn-secondary"
                          onClick={() => navigate('/calendar')}
                        >
                          View Calendar
                        </button>
                      </div>
                    ) : (
                      upcomingEvents.map((event, idx) => {
                        const startTime = event.start?.dateTime || event.start?.date;
                        const eventDate = startTime ? new Date(startTime) : null;
                        
                        return (
                          <div key={idx} className="calendar-item event-item">
                            <div className="item-left">
                              <div className="item-indicator google-event"></div>
                              <div className="item-details">
                                <h5 className="item-title">{event.summary}</h5>
                                <p className="item-meta">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#4285F4">
                                    <circle cx="12" cy="12" r="10"/>
                                  </svg>
                                  {eventDate ? eventDate.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    ...(event.start?.dateTime ? { hour: 'numeric', minute: '2-digit' } : {})
                                  }) : 'No date'}
                                </p>
                              </div>
                            </div>
                            {event.location && (
                              <span className="event-location-badge" title={event.location}>
                                📍
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </div>

              {/* View All Link */}
              {((activeCalendarTab === 'tasks' && getUpcomingTasks().length > 0) || 
                (activeCalendarTab === 'events' && upcomingEvents.length > 0)) && (
                <div className="calendar-footer">
                  <button 
                    className="btn-link"
                    onClick={() => navigate('/calendar')}
                  >
                    View all in Calendar →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map Module - The main feature */}
      {/* <div className="crm-map-section">
        <div className="section-header">
          <div>
            <h2>Customer Map</h2>
            <p>Visualize your customers geographically</p>
          </div>
          <button 
            onClick={() => navigate('/map')}
            className="view-full-map-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/>
              <line x1="8" y1="2" x2="8" y2="18"/>
              <line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            View Full Map
          </button>
        </div>
        <div className="map-module-container">
          <MapModule customers={customers} />
        </div>
      </div> */}

      {/* Recent Activity */}
      <div className="crm-recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {customers.slice(0, 5).map(customer => (
            <div key={customer.id} className="activity-item">
              <div className="activity-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
              </div>
              <div className="activity-content">
                <p className="activity-title">
                  <strong>{customer.name}</strong> added to system
                </p>
                <p className="activity-time">
                  {customer.city}, {customer.state}
                </p>
              </div>
              <span 
                className="activity-status"
                style={{
                  backgroundColor: 
                    customer.status === 'customer' ? '#10b981' :
                    customer.status === 'prospect' ? '#f59e0b' : '#6b7280'
                }}
              >
                {customer.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;

