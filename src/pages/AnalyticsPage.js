import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGetCustomers } from '../lib/api';
import { renderMarkdown } from '../utils/markdown';

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // AI Insights state
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Fetch customer data
  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoading(true);
        const sitesData = await apiGetCustomers().catch(() => []);
        
        const convertedSites = sitesData.map(site => ({
          id: site.id,
          customer_id: site.claimed_by || site.id,
          name: site.name || site.company || 'Unknown Customer',
          address: site.address || 'Unknown Address',
          city: site.city || 'Unknown',
          state: site.state || 'XX',
          zip_code: site.postal_code || '00000',
          latitude: site.latitude,
          longitude: site.longitude,
          'product(s)_interested': site.products_interested || ['Unknown'],
          registered_at: site.registered_at || site.created_at ? 
            (site.registered_at || site.created_at).split('T')[0] : 
            new Date().toISOString().split('T')[0],
          status: site.status || 'new',
          customer_type: site.customer_type || 'customer',
          source_system: site.source_system || 'unknown'
        }));
        
        setSites(convertedSites);
        setError(null);
      } catch (err) {
        console.error('Error fetching sites:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, []);

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!sites || sites.length === 0) return null;

    // Total sites
    const totalSites = sites.length;

    // Status breakdown
    const statusStats = sites.reduce((acc, site) => {
      acc[site.status] = (acc[site.status] || 0) + 1;
      return acc;
    }, { customer: 0, prospect: 0, lead: 0 });

    // Product distribution
    const productStats = {};
    sites.forEach(site => {
      const products = site['product(s)_interested'] || ['Unknown'];
      products.forEach(product => {
        productStats[product] = (productStats[product] || 0) + 1;
      });
    });

    // Top cities
    const cityStats = sites.reduce((acc, site) => {
      const cityState = `${site.city}, ${site.state}`;
      if (!acc[cityState]) {
        acc[cityState] = { 
          city: site.city, 
          state: site.state, 
          count: 0,
          customers: 0,
          prospects: 0,
          leads: 0
        };
      }
      acc[cityState].count++;
      if (site.status === 'customer') acc[cityState].customers++;
      if (site.status === 'prospect') acc[cityState].prospects++;
      if (site.status === 'lead') acc[cityState].leads++;
      return acc;
    }, {});

    const topCities = Object.values(cityStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top states
    const stateStats = sites.reduce((acc, site) => {
      if (!acc[site.state]) {
        acc[site.state] = { 
          state: site.state, 
          count: 0,
          customers: 0,
          prospects: 0,
          leads: 0
        };
      }
      acc[site.state].count++;
      if (site.status === 'customer') acc[site.state].customers++;
      if (site.status === 'prospect') acc[site.state].prospects++;
      if (site.status === 'lead') acc[site.state].leads++;
      return acc;
    }, {});

    const topStates = Object.values(stateStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Timeline data (last 12 months)
    const now = new Date();
    const timelineData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7);
      const count = sites.filter(site => 
        site.registered_at && site.registered_at.startsWith(monthKey)
      ).length;
      timelineData.push([monthKey, count]);
    }

    return {
      totalSites,
      statusStats,
      productStats,
      topCities,
      topStates,
      timelineData
    };
  }, [sites]);

  // Get product color
  const getProductColor = (productName) => {
    const productLower = productName.toLowerCase();
    if (productLower.includes('audiosight')) return '#ef4444';
    if (productLower.includes('sate')) return '#3b82f6';
    if (productLower.includes('armrehab')) return '#10b981';
    return '#8b5cf6';
  };

  // AI Insights generation
  const generateAIInsights = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiInsights(null);

    try {
      const apiKey = process.env.REACT_APP_OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error('OpenRouter API key not configured');
      }

      const prompt = `Analyze this CRM customer data and provide actionable marketing insights:

Total Sites: ${analytics.totalSites}
Customers: ${analytics.statusStats.customer}
Prospects: ${analytics.statusStats.prospect}
Leads: ${analytics.statusStats.lead}

Top 5 Cities:
${analytics.topCities.slice(0, 5).map((c, i) => `${i + 1}. ${c.city}, ${c.state}: ${c.count} (${c.customers}C, ${c.prospects}P, ${c.leads}L)`).join('\n')}

Top 5 States:
${analytics.topStates.slice(0, 5).map((s, i) => `${i + 1}. ${s.state}: ${s.count} (${s.customers}C, ${s.prospects}P, ${s.leads}L)`).join('\n')}

Product Distribution:
${Object.entries(analytics.productStats).map(([product, count]) => `- ${product}: ${count}`).join('\n')}

Provide:
1. Geographic targeting recommendations
2. Product-specific marketing strategies
3. Lead conversion opportunities
4. Market expansion suggestions
5. Priority action items

Keep insights concise, actionable, and data-driven. Use markdown formatting.`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Customer Atlas CRM'
        },
        body: JSON.stringify({
          model: 'google/gemma-2-27b-it:free',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const insights = data.choices[0].message.content;
      setAiInsights(insights);
    } catch (error) {
      console.error('AI Insights error:', error);
      setAiError(error.message || 'Failed to generate insights. Please check your API key.');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 60,
            height: 60,
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: 16 }}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center', maxWidth: 500 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#dc2626', marginBottom: 8 }}>Error Loading Data</h2>
          <p style={{ color: '#6b7280' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              padding: '10px 20px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f9fafb'
      }}>
        <p style={{ color: '#6b7280' }}>No data available</p>
      </div>
    );
  }

  const conversionRate = analytics.totalSites > 0 
    ? ((analytics.statusStats.customer / analytics.totalSites) * 100).toFixed(1)
    : '0.0';

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        zIndex: 100,
        padding: '16px 32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '8px 12px',
                background: '#fff',
                border: '2px solid #e5e7eb',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 600,
                color: '#374151'
              }}
            >
              ← Back to Map
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>
                Analytics Dashboard
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                Comprehensive overview of customer data and insights
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ padding: 32 }}>
        {/* KPI Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: 20, 
          marginBottom: 32 
        }}>
          <div style={{ 
            background: '#fff', 
            padding: 24, 
            borderRadius: 12, 
            border: '2px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: '#6b7280', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 12
            }}>
              Total Sites
            </div>
            <div style={{ 
              fontSize: 36, 
              fontWeight: 700, 
              color: '#111827',
              marginBottom: 8
            }}>
              {analytics.totalSites}
            </div>
            <div style={{ 
              fontSize: 12, 
              color: '#3b82f6',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              All tracked locations
            </div>
          </div>
          
          <div style={{ 
            background: '#fff', 
            padding: 24, 
            borderRadius: 12, 
            border: '2px solid #10b981',
            boxShadow: '0 1px 3px rgba(16,185,129,0.1)'
          }}>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: '#6b7280', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 12
            }}>
              Customers
            </div>
            <div style={{ 
              fontSize: 36, 
              fontWeight: 700, 
              color: '#10b981',
              marginBottom: 8
            }}>
              {analytics.statusStats.customer}
            </div>
            <div style={{ 
              fontSize: 12, 
              color: '#6b7280',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Active paying customers
            </div>
          </div>

          <div style={{ 
            background: '#fff', 
            padding: 24, 
            borderRadius: 12, 
            border: '2px solid #f59e0b',
            boxShadow: '0 1px 3px rgba(245,158,11,0.1)'
          }}>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: '#6b7280', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 12
            }}>
              Prospects
            </div>
            <div style={{ 
              fontSize: 36, 
              fontWeight: 700, 
              color: '#f59e0b',
              marginBottom: 8
            }}>
              {analytics.statusStats.prospect}
            </div>
            <div style={{ 
              fontSize: 12, 
              color: '#6b7280',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
              High-potential leads
            </div>
          </div>

          <div style={{ 
            background: '#fff', 
            padding: 24, 
            borderRadius: 12, 
            border: '2px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: '#6b7280', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 12
            }}>
              Conversion Rate
            </div>
            <div style={{ 
              fontSize: 36, 
              fontWeight: 700, 
              color: '#8b5cf6',
              marginBottom: 8
            }}>
              {conversionRate}%
            </div>
            <div style={{ 
              fontSize: 12, 
              color: '#6b7280',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              Leads to customers
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Product Distribution Chart */}
          <div style={{ 
            background: '#fff', 
            padding: 24, 
            borderRadius: 12, 
            border: '2px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 20
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: 18, 
                fontWeight: 700,
                color: '#111827'
              }}>
                Product Distribution
              </h3>
              <span style={{ 
                fontSize: 12, 
                color: '#6b7280',
                background: '#f3f4f6',
                padding: '4px 8px',
                borderRadius: 6,
                fontWeight: 600
              }}>
                {Object.keys(analytics.productStats).length} Products
              </span>
            </div>
            
            <div style={{ display: 'grid', gap: 16 }}>
              {Object.entries(analytics.productStats)
                .sort(([, a], [, b]) => b - a)
                .map(([product, count]) => {
                const percentage = ((count / analytics.totalSites) * 100).toFixed(1);
                const color = getProductColor(product);
                return (
                  <div key={product}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      marginBottom: 8,
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ 
                          width: 14, 
                          height: 14, 
                          borderRadius: 4, 
                          background: color,
                          border: '2px solid #fff',
                          boxShadow: '0 0 0 1px #e5e7eb'
                        }}></div>
                        <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                          {product}
                        </span>
                      </div>
                      <span style={{ 
                        fontWeight: 700, 
                        fontSize: 14,
                        color: '#6b7280'
                      }}>
                        {count} <span style={{ fontWeight: 500, fontSize: 12 }}>({percentage}%)</span>
                      </span>
                    </div>
                    <div style={{ 
                      background: '#f3f4f6', 
                      height: 8, 
                      borderRadius: 6, 
                      overflow: 'hidden',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ 
                        background: color, 
                        height: '100%', 
                        width: `${percentage}%`,
                        transition: 'width 0.5s ease',
                        boxShadow: `inset 0 -2px 4px rgba(0,0,0,0.1)`
                      }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Breakdown Chart */}
          <div style={{ 
            background: '#fff', 
            padding: 24, 
            borderRadius: 12, 
            border: '2px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 20
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: 18, 
                fontWeight: 700,
                color: '#111827'
              }}>
                Status Breakdown
              </h3>
              <span style={{ 
                fontSize: 12, 
                color: '#6b7280',
                background: '#f3f4f6',
                padding: '4px 8px',
                borderRadius: 6,
                fontWeight: 600
              }}>
                Pipeline View
              </span>
            </div>

            {/* Status visualization */}
            <div style={{ display: 'grid', gap: 20 }}>
              {[
                { 
                  status: 'customer', 
                  count: analytics.statusStats.customer, 
                  color: '#10b981', 
                  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                },
                { 
                  status: 'prospect', 
                  count: analytics.statusStats.prospect, 
                  color: '#f59e0b', 
                  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="6"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                  </svg>
                },
                { 
                  status: 'lead', 
                  count: analytics.statusStats.lead, 
                  color: '#6b7280', 
                  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                }
              ].map(({ status, count, color, icon }) => {
                const percentage = ((count / analytics.totalSites) * 100).toFixed(1);
                return (
                  <div key={status} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 16,
                    padding: 16,
                    background: '#f9fafb',
                    borderRadius: 10,
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 12,
                      background: color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: 13, 
                        fontWeight: 600, 
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: 4
                      }}>
                        {status}
                      </div>
                      <div style={{ 
                        fontSize: 24, 
                        fontWeight: 700, 
                        color: '#111827' 
                      }}>
                        {count}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: 20, 
                      fontWeight: 700, 
                      color: color 
                    }}>
                      {percentage}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Registration Timeline - Full Width */}
        <div style={{ 
          background: '#fff', 
          padding: 24, 
          borderRadius: 12, 
          border: '2px solid #e5e7eb',
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 24
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: 18, 
              fontWeight: 700,
              color: '#111827'
            }}>
              Registration Timeline
            </h3>
            <span style={{ 
              fontSize: 12, 
              color: '#6b7280',
              background: '#f3f4f6',
              padding: '4px 8px',
              borderRadius: 6,
              fontWeight: 600
            }}>
              Last 12 Months
            </span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-end', 
            gap: 8, 
            height: 180,
            padding: '0 8px'
          }}>
            {analytics.timelineData.map(([month, count]) => {
              const maxCount = Math.max(...analytics.timelineData.map(([, c]) => c));
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={month} style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: 8,
                  minWidth: 0
                }}>
                  <div style={{ 
                    fontSize: 11, 
                    fontWeight: 700, 
                    color: '#111827',
                    background: '#f3f4f6',
                    padding: '2px 6px',
                    borderRadius: 4,
                    minWidth: 24,
                    textAlign: 'center'
                  }}>
                    {count}
                  </div>
                  <div style={{ 
                    background: '#3b82f6', 
                    width: '100%', 
                    height: `${height}%`, 
                    minHeight: '4px', 
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.5s ease',
                    boxShadow: '0 -2px 8px rgba(59,130,246,0.3)',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: 'rgba(255,255,255,0.5)',
                      borderRadius: '4px 4px 0 0'
                    }}></div>
                  </div>
                  <div style={{ 
                    fontSize: 10, 
                    color: '#6b7280', 
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%',
                    textAlign: 'center'
                  }}>
                    {month.split('-')[1]}/{month.split('-')[0].slice(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Row: Top Cities and Top States */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Top Cities */}
          <div style={{ 
            background: '#fff', 
            padding: 24, 
            borderRadius: 12, 
            border: '2px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 20
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: 18, 
                fontWeight: 700,
                color: '#111827'
              }}>
                Top Cities
              </h3>
              <span style={{ 
                fontSize: 12, 
                color: '#6b7280',
                background: '#f3f4f6',
                padding: '4px 8px',
                borderRadius: 6,
                fontWeight: 600
              }}>
                Top 10
              </span>
            </div>
            
            <div style={{ display: 'grid', gap: 0 }}>
              {analytics.topCities.map((city, idx) => (
                <div 
                  key={city.city} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px 8px', 
                    borderBottom: idx < analytics.topCities.length - 1 ? '1px solid #f3f4f6' : 'none',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                      width: 28, 
                      height: 28, 
                      borderRadius: 8,
                      background: idx < 3 ? '#3b82f6' : '#e5e7eb',
                      color: idx < 3 ? '#fff' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 13,
                      flexShrink: 0
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                        {city.city}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        {city.customers}C · {city.prospects}P · {city.leads}L
                      </div>
                    </div>
                  </div>
                  <div style={{ 
                    fontWeight: 700, 
                    color: '#3b82f6',
                    fontSize: 16
                  }}>
                    {city.count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top States */}
          <div style={{ 
            background: '#fff', 
            padding: 24, 
            borderRadius: 12, 
            border: '2px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 20
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: 18, 
                fontWeight: 700,
                color: '#111827'
              }}>
                Top States
              </h3>
              <span style={{ 
                fontSize: 12, 
                color: '#6b7280',
                background: '#f3f4f6',
                padding: '4px 8px',
                borderRadius: 6,
                fontWeight: 600
              }}>
                Top 10
              </span>
            </div>
            
            <div style={{ display: 'grid', gap: 0 }}>
              {analytics.topStates.map((state, idx) => (
                <div 
                  key={state.state} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px 8px', 
                    borderBottom: idx < analytics.topStates.length - 1 ? '1px solid #f3f4f6' : 'none',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                      width: 28, 
                      height: 28, 
                      borderRadius: 8,
                      background: idx < 3 ? '#10b981' : '#e5e7eb',
                      color: idx < 3 ? '#fff' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 13,
                      flexShrink: 0
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                        {state.state}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        {state.customers}C · {state.prospects}P · {state.leads}L
                      </div>
                    </div>
                  </div>
                  <div style={{ 
                    fontWeight: 700, 
                    color: '#10b981',
                    fontSize: 16
                  }}>
                    {state.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Marketing Insights Section */}
        <div style={{ 
          background: '#fff', 
          padding: 24, 
          borderRadius: 12, 
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '2px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 20
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: 18, 
              fontWeight: 700,
              color: '#111827'
            }}>
              🤖 AI Marketing Insights
            </h3>
            <button
              onClick={generateAIInsights}
              disabled={aiLoading}
              style={{
                padding: '10px 20px',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                background: aiLoading ? '#f3f4f6' : '#3b82f6',
                color: aiLoading ? '#6b7280' : '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                cursor: aiLoading ? 'wait' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              onMouseOver={(e) => {
                if (!aiLoading) {
                  e.currentTarget.style.background = '#2563eb';
                }
              }}
              onMouseOut={(e) => {
                if (!aiLoading) {
                  e.currentTarget.style.background = '#3b82f6';
                }
              }}
            >
              {aiLoading ? (
                <>
                  <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="m9 12 2 2 4-4"></path>
                  </svg>
                  Generate Insights
                </>
              )}
            </button>
          </div>

          <div style={{
            background: '#f9fafb',
            borderRadius: 8,
            padding: 24,
            minHeight: 300,
            border: '1px solid #e5e7eb'
          }}>
            {aiLoading && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 300,
                gap: 16
              }}>
                <div style={{
                  width: 60,
                  height: 60,
                  border: '4px solid #f3f4f6',
                  borderTop: '4px solid #667eea',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ color: '#6b7280', fontSize: 16, fontWeight: 600 }}>
                  AI is analyzing your customer data...
                </p>
              </div>
            )}

            {aiError && !aiLoading && (
              <div style={{
                background: '#fef2f2',
                border: '2px solid #fecaca',
                borderRadius: 10,
                padding: 20,
                display: 'flex',
                alignItems: 'start',
                gap: 12
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#dc2626', fontSize: 16, fontWeight: 700 }}>
                    Error Generating Insights
                  </h4>
                  <p style={{ margin: 0, color: '#991b1b', fontSize: 14 }}>
                    {aiError}
                  </p>
                  <p style={{ margin: '12px 0 0 0', color: '#991b1b', fontSize: 13, fontStyle: 'italic' }}>
                    💡 Tip: Add REACT_APP_OPENROUTER_API_KEY to frontend/.env file.
                  </p>
                </div>
              </div>
            )}

            {!aiInsights && !aiLoading && !aiError && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 300,
                gap: 16,
                textAlign: 'center'
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  background: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                    <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                    <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: 16, fontWeight: 600 }}>
                    Ready to Analyze Your Data
                  </h4>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: 14, maxWidth: 500 }}>
                    Click "Generate Insights" to get AI-powered marketing recommendations.
                  </p>
                </div>
                <div style={{
                  marginTop: 12,
                  padding: '12px 16px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 6,
                  maxWidth: 600
                }}>
                  <p style={{ margin: 0, color: '#1e40af', fontSize: 13, fontWeight: 500 }}>
                    ✨ AI will analyze: Geographic trends, Product preferences, Conversion patterns, Lead quality, and Marketing opportunities
                  </p>
                </div>
              </div>
            )}

            {aiInsights && !aiLoading && (
              <div>
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span style={{ color: '#166534', fontSize: 13, fontWeight: 600 }}>
                    Insights generated successfully! Last updated: {new Date().toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ 
                  padding: '20px',
                  background: '#fff',
                  borderRadius: 6,
                  border: '1px solid #e5e7eb'
                }}>
                  {renderMarkdown(aiInsights)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AnalyticsPage;



