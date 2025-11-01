import React, { useState } from 'react';
import './EmailComposer.css';

/**
 * EmailComposer Component
 * 
 * A modal for composing and sending emails to customers
 * Supports both single and bulk email sending
 * 
 * @param {Object} customer - Single customer object (for single email)
 * @param {Array} customers - Array of customers (for bulk email)
 * @param {Boolean} isBulk - Whether this is a bulk email operation
 * @param {Function} onClose - Callback when modal is closed
 * @param {Function} onSendComplete - Callback when email is sent successfully
 */
const EmailComposer = ({ customer, customers, isBulk = false, onClose, onSendComplete }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });

  // AI Helper state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const recipientList = isBulk ? customers : [customer];
  const recipientCount = recipientList.length;

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      setError('Please fill in both subject and message');
      return;
    }

    setSending(true);
    setError(null);
    setSendProgress({ current: 0, total: recipientCount });

    try {
      if (isBulk) {
        // Send individual emails to each customer
        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < recipientList.length; i++) {
          const recipient = recipientList[i];
          setSendProgress({ current: i + 1, total: recipientCount });

          try {
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                to: recipient.email,
                subject: subject,
                message: message,
                customerName: recipient.name
              })
            });

            const data = await response.json();

            if (response.ok) {
              successCount++;
            } else {
              failedCount++;
              console.error(`Failed to send to ${recipient.email}:`, data.error);
            }

            // Small delay between emails to avoid rate limiting
            if (i < recipientList.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (err) {
            failedCount++;
            console.error(`Error sending to ${recipient.email}:`, err);
          }
        }

        if (failedCount > 0) {
          setError(`Sent to ${successCount} customers, ${failedCount} failed`);
        } else {
          setSuccess(true);
        }
      } else {
        // Single email
        const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            to: customer.email,
            subject: subject,
            message: message,
            customerName: customer.name
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send email');
        }

        setSuccess(true);
      }

      setTimeout(() => {
        if (onSendComplete) onSendComplete();
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Error sending email:', err);
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  // AI Email Helper
  const generateAIEmail = async (action) => {
    setAiLoading(true);
    setAiError(null);
    setShowAiMenu(false);

    try {
      const apiKey = process.env.REACT_APP_OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error('OpenRouter API key not configured. Add REACT_APP_OPENROUTER_API_KEY to your .env file.');
      }

      let prompt = '';
      const customerInfo = isBulk 
        ? `${recipientCount} customers (bulk email)` 
        : `${customer.name}${customer.company ? ` from ${customer.company}` : ''}${customer.status ? ` (${customer.status})` : ''}`;

      switch (action) {
        case 'custom':
          if (!customPrompt.trim()) {
            throw new Error('Please enter a custom prompt first.');
          }
          prompt = `You are a professional email writer. Write a business email to: ${customerInfo}.
          
Current Subject: ${subject || 'No subject yet'}
Current Message: ${message || 'No content yet'}

User's Instructions:
${customPrompt}

IMPORTANT RULES:
- Write naturally and conversationally (not overly formal)
- Use the actual customer name provided, NOT placeholders like [Customer Name]
- Keep it concise (2-3 short paragraphs max)
- Be specific and actionable
- No brackets or placeholder text
- Sound like a real person, not a template
- Get to the point quickly

Return ONLY in this format:
SUBJECT: [write actual subject line]
MESSAGE:
[write actual email body - no placeholders, no brackets]`;
          break;

        case 'generate':
          prompt = `You are a professional email writer. Write a business email to: ${customerInfo}.
          
Subject hint: ${subject || 'Initial outreach'}
Context: ${message || 'Professional introduction email'}

IMPORTANT RULES:
- Write naturally and conversationally (friendly but professional)
- Use the actual customer name provided (${isBulk ? 'personalize for bulk emails' : customer.name})
- Keep it SHORT and focused (2-3 paragraphs, 100-150 words total)
- Be warm and human, not robotic
- Clear call-to-action at the end
- NO placeholder text like [Company Name] or [Your Name]
- Sound like a real person reaching out

Return ONLY in this format:
SUBJECT: [write compelling, specific subject line]
MESSAGE:
[write natural, concise email - use actual names]`;
          break;

        case 'improve':
          if (!message.trim()) {
            throw new Error('Please write some content first, then I can help improve it.');
          }
          prompt = `You are a professional email writer. Improve this email to: ${customerInfo}

Current Subject: ${subject || 'No subject'}
Current Message:
${message}

IMPORTANT RULES:
- Make it MORE concise and direct
- Keep it natural and conversational
- Remove any placeholder text or brackets
- Make it sound human and warm
- Improve clarity and flow
- Stronger call-to-action
- Maximum 150 words

Return ONLY in this format:
SUBJECT: [improved subject line]
MESSAGE:
[improved, concise message]`;
          break;

        case 'professional':
          if (!message.trim()) {
            throw new Error('Please write some content first, then I can make it more professional.');
          }
          prompt = `You are a professional email writer. Rewrite this email in a more polished, professional tone:

Current Message:
${message}

IMPORTANT RULES:
- Professional but NOT overly formal
- Keep it warm and approachable
- Remove casual language
- Keep it concise (under 150 words)
- NO placeholder text or brackets
- Sound like a real professional, not a template

Return the improved version.`;
          break;

        case 'shorten':
          if (!message.trim()) {
            throw new Error('Please write some content first, then I can shorten it.');
          }
          prompt = `You are a professional email writer. Shorten this email to: ${customerInfo}

${message}

IMPORTANT RULES:
- Cut to 50-75 words maximum
- Keep ONLY the essential message
- Maintain the core value and call-to-action
- Sound natural and direct
- NO placeholder text
- Get straight to the point

Return the shortened version (no extra formatting).`;
          break;

        case 'expand':
          if (!message.trim()) {
            throw new Error('Please write some content first, then I can expand it.');
          }
          prompt = `You are a professional email writer. Expand this email to: ${customerInfo}

${message}

IMPORTANT RULES:
- Add relevant details and context
- Maximum 200-250 words (don't make it too long!)
- Include specific benefits or examples
- Keep it natural and conversational
- NO placeholder text or brackets
- Still maintain good readability
- Sound human, not like marketing copy

Return the expanded version (no extra formatting).`;
          break;

        default:
          throw new Error('Unknown AI action');
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Customer Atlas CRM - Email Helper'
        },
        body: JSON.stringify({
          model: 'google/gemma-3-27b-it:free',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // Parse the AI response
      if (action === 'generate' || action === 'improve' || action === 'custom') {
        const subjectMatch = aiResponse.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
        const messageMatch = aiResponse.match(/MESSAGE:\s*\n([\s\S]+)$/i);

        if (subjectMatch && messageMatch) {
          setSubject(subjectMatch[1].trim());
          setMessage(messageMatch[1].trim());
        } else {
          // If parsing fails, just set the whole response as message
          setMessage(aiResponse.trim());
        }
      } else {
        // For other actions, just update the message
        setMessage(aiResponse.trim());
      }

    } catch (error) {
      console.error('AI Email Helper error:', error);
      setAiError(error.message || 'Failed to generate email content');
    } finally {
      setAiLoading(false);
    }
  };

  // Email templates
  const insertTemplate = (template) => {
    switch (template) {
      case 'introduction':
        setSubject('Introduction to Our Services');
        setMessage(`I hope this email finds you well.

I wanted to reach out and introduce our company and the services we provide. We specialize in innovative healthcare solutions that can help transform your organization.

Would you be available for a brief call next week to discuss how we might be able to support your needs?

Looking forward to hearing from you.`);
        break;
      case 'followup':
        setSubject('Following Up on Our Previous Conversation');
        setMessage(`I wanted to follow up on our previous conversation and see if you had any questions.

Is there anything I can help clarify or any additional information you need?

I'm here to help and look forward to continuing our discussion.`);
        break;
      case 'demo':
        setSubject('Schedule a Product Demo');
        setMessage(`I'd love to show you a demonstration of our product and how it can benefit your organization.

Are you available for a 30-minute demo session this week or next?

Please let me know what times work best for you, and I'll send over a calendar invite.`);
        break;
      default:
        break;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content email-composer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="email-header-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <div>
              <h3>Compose Email</h3>
              <p className="recipient-info">
                {isBulk 
                  ? `To: ${recipientCount} customer${recipientCount > 1 ? 's' : ''}`
                  : `To: ${customer.email}`
                }
              </p>
            </div>
          </div>
          <button onClick={onClose} className="close-button" disabled={sending}>×</button>
        </div>

        {/* Body */}
        <div className="modal-body email-composer-body">
          {error && (
            <div className="email-alert email-alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {aiError && (
            <div className="email-alert email-alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              AI Helper: {aiError}
            </div>
          )}

          {success && (
            <div className="email-alert email-alert-success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              {isBulk 
                ? `Emails sent successfully to ${recipientCount} customer${recipientCount > 1 ? 's' : ''}!`
                : 'Email sent successfully!'
              }
            </div>
          )}

          {sending && isBulk && (
            <div className="email-alert" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              Sending email {sendProgress.current} of {sendProgress.total}...
            </div>
          )}

          {/* AI Email Helper */}
          <div className="ai-helper-section">
            <div className="ai-helper-header">
              <label className="email-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
                AI Email Helper:
              </label>
              <button 
                className="ai-toggle-btn"
                onClick={() => setShowAiMenu(!showAiMenu)}
                disabled={aiLoading || sending}
              >
                {showAiMenu ? 'Hide AI Actions' : 'Show AI Actions'}
              </button>
            </div>
            
            {showAiMenu && (
              <>
                {/* Custom Prompt Input */}
                <div className="ai-custom-prompt">
                  <label className="email-label" style={{ marginBottom: '8px' }}>
                    Custom Instructions (Tell AI what you want):
                  </label>
                  <div className="custom-prompt-group">
                    <textarea
                      className="custom-prompt-input"
                      placeholder="Example: Write a friendly follow-up email about our meeting last week..."
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      rows={3}
                      disabled={aiLoading || sending}
                    />
                    <button 
                      className="ai-action-btn ai-custom"
                      onClick={() => generateAIEmail('custom')}
                      disabled={aiLoading || sending || !customPrompt.trim()}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                      Generate with My Prompt
                    </button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="ai-quick-actions-label">
                  <span>Or use quick actions:</span>
                </div>

                <div className="ai-actions-menu">
                  <button 
                    className="ai-action-btn ai-generate"
                    onClick={() => generateAIEmail('generate')}
                    disabled={aiLoading || sending}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Generate Draft
                  </button>
                <button 
                  className="ai-action-btn ai-improve"
                  onClick={() => generateAIEmail('improve')}
                  disabled={aiLoading || sending || !message.trim()}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  </svg>
                  Improve Writing
                </button>
                <button 
                  className="ai-action-btn ai-professional"
                  onClick={() => generateAIEmail('professional')}
                  disabled={aiLoading || sending || !message.trim()}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Make Professional
                </button>
                <button 
                  className="ai-action-btn ai-shorten"
                  onClick={() => generateAIEmail('shorten')}
                  disabled={aiLoading || sending || !message.trim()}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Shorten
                </button>
                <button 
                  className="ai-action-btn ai-expand"
                  onClick={() => generateAIEmail('expand')}
                  disabled={aiLoading || sending || !message.trim()}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 3 21 3 21 9"/>
                    <polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/>
                    <line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                  Expand
                </button>
                </div>
              </>
            )}

            {aiLoading && (
              <div className="ai-loading">
                <div className="ai-loading-spinner"></div>
                <span>AI is writing your email...</span>
              </div>
            )}
          </div>

          {/* Quick Templates */}
          <div className="email-templates">
            <label className="email-label">Quick Templates:</label>
            <div className="template-buttons">
              <button 
                className="template-btn"
                onClick={() => insertTemplate('introduction')}
                disabled={sending}
              >
                📧 Introduction
              </button>
              <button 
                className="template-btn"
                onClick={() => insertTemplate('followup')}
                disabled={sending}
              >
                🔄 Follow-up
              </button>
              <button 
                className="template-btn"
                onClick={() => insertTemplate('demo')}
                disabled={sending}
              >
                🎯 Demo Request
              </button>
            </div>
          </div>

          {/* Customer Info */}
          <div className="customer-info-card">
            {isBulk ? (
              <>
                <div className="customer-info-row">
                  <label>Recipients:</label>
                  <span>{recipientCount} customer{recipientCount > 1 ? 's' : ''}</span>
                </div>
                {/* <div className="customer-info-row">
                  <label>Note:</label>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    Each customer will receive the email individually. They won't see other recipients.
                  </span>
                </div> */}
                <div style={{ marginTop: '12px', maxHeight: '120px', overflowY: 'auto', padding: '8px', background: '#f9fafb', borderRadius: '4px' }}>
                  {recipientList.map((c, idx) => (
                    <div key={idx} style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                      • {c.name} ({c.email})
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="customer-info-row">
                  <label>Customer:</label>
                  <span>{customer.name}</span>
                </div>
                {customer.company && (
                  <div className="customer-info-row">
                    <label>Company:</label>
                    <span>{customer.company}</span>
                  </div>
                )}
                <div className="customer-info-row">
                  <label>Status:</label>
                  <span className="status-badge-small" style={{ 
                    backgroundColor: customer.status === 'customer' ? '#10b981' :
                                    customer.status === 'prospect' ? '#f59e0b' : '#6b7280'
                  }}>
                    {customer.status}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Subject */}
          <div className="email-form-group">
            <label className="email-label">Subject *</label>
            <input
              type="text"
              className="email-input"
              placeholder="Enter email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending || success}
            />
          </div>

          {/* Message */}
          <div className="email-form-group">
            <label className="email-label">Message *</label>
            <textarea
              className="email-textarea"
              placeholder="Type your message here..."
              rows={12}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending || success}
            />
            <div className="character-count">
              {message.length} characters
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button 
            onClick={handleSend} 
            className="btn-primary btn-send-email"
            disabled={sending || success || !subject.trim() || !message.trim()}
          >
            {sending ? (
              <>
                <div className="btn-spinner"></div>
                Sending...
              </>
            ) : success ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Sent!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Send Email
              </>
            )}
          </button>
          <button 
            onClick={onClose} 
            className="btn-secondary"
            disabled={sending}
          >
            {success ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer;

