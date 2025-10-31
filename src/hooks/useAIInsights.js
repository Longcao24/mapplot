import { useState } from 'react';
import { normalizeProducts } from '../utils/customerData';

/**
 * Custom hook for generating AI marketing insights
 */
export const useAIInsights = (sites) => {
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Function to generate AI marketing insights using OpenRouter
  const generateAIInsights = async () => {
    if (!sites || sites.length === 0) {
      setAiError('No customer data available for analysis');
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      // Prepare data summary for AI analysis
      const dataSummary = {
        totalCustomers: sites.length,
        statuses: sites.reduce((acc, site) => {
          acc[site.status] = (acc[site.status] || 0) + 1;
          return acc;
        }, {}),
        topStates: Object.entries(
          sites.reduce((acc, site) => {
            acc[site.state] = (acc[site.state] || 0) + 1;
            return acc;
          }, {})
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
        products: sites.reduce((acc, site) => {
          const products = normalizeProducts(site['product(s)_interested']);
          products.forEach(p => {
            acc[p] = (acc[p] || 0) + 1;
          });
          return acc;
        }, {}),
        geographicSpread: {
          uniqueStates: new Set(sites.map(s => s.state)).size,
          uniqueCities: new Set(sites.map(s => `${s.city}, ${s.state}`)).size
        },
        timelineData: sites
          .filter(s => s.registered_at)
          .reduce((acc, site) => {
            const month = site.registered_at.substring(0, 7); // YYYY-MM
            acc[month] = (acc[month] || 0) + 1;
            return acc;
          }, {})
      };

      // Call OpenRouter API with Gemini model
      // Get API key from environment variable or use placeholder
      const apiKey = process.env.REACT_APP_OPENROUTER_API_KEY || 'sk-or-v1-YOUR_API_KEY_HERE';
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Customer Atlas CRM'
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b:free',
          messages: [
            {
              role: 'system',
              content: 'You are a marketing analytics expert. Analyze CRM data and provide actionable marketing insights in a structured format. Be concise and data-driven.'
            },
            {
              role: 'user',
              content: `Analyze this CRM data and provide marketing insights:

Data Summary:
- Total Customers: ${dataSummary.totalCustomers}
- Status Breakdown: ${JSON.stringify(dataSummary.statuses)}
- Top 5 States: ${dataSummary.topStates.map(([state, count]) => `${state} (${count})`).join(', ')}
- Products Interest: ${JSON.stringify(dataSummary.products)}
- Geographic Spread: ${dataSummary.geographicSpread.uniqueStates} states, ${dataSummary.geographicSpread.uniqueCities} cities
- Monthly Registration Trend: ${JSON.stringify(dataSummary.timelineData)}

Please provide:
1. Key Insights (3-4 bullet points)
2. Geographic Strategy Recommendations
3. Product Marketing Opportunities
4. Lead Conversion Recommendations
5. Risk Areas to Address

Format your response with clear sections and bullet points.`
            }
          ],
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const insights = data.choices[0]?.message?.content;

      if (insights) {
        setAiInsights(insights);
      } else {
        throw new Error('No insights generated');
      }
    } catch (error) {
      console.error('AI Insights Error:', error);
      setAiError(error.message || 'Failed to generate insights. Please check your API key.');
    } finally {
      setAiLoading(false);
    }
  };

  return {
    aiInsights,
    aiLoading,
    aiError,
    generateAIInsights
  };
};



