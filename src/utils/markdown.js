import React from 'react';

/**
 * Function to parse and render markdown with beautiful styling
 * Supports: tables, headers (## and ###), bullet points, numbered lists, bold titles, and inline formatting
 */
export const renderMarkdown = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: 12 }} />);
      i++;
      continue;
    }

    // Tables (detect by pipes and separator line)
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('|') && lines[i + 1].match(/^[\s|:-]+$/)) {
      const tableLines = [line];
      let j = i + 1;
      
      // Collect all table lines
      while (j < lines.length && lines[j].includes('|')) {
        tableLines.push(lines[j]);
        j++;
      }
      
      // Parse header
      const headers = line.split('|').map(h => h.trim()).filter(h => h);
      
      // Parse rows (skip separator line at index 1)
      const rows = [];
      for (let k = 2; k < tableLines.length; k++) {
        const cells = tableLines[k].split('|').map(c => c.trim()).filter(c => c);
        if (cells.length > 0) {
          rows.push(cells);
        }
      }
      
      elements.push(
        <div key={key++} style={{
          overflowX: 'auto',
          margin: '20px 0',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 14
          }}>
            <thead>
              <tr style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
              }}>
                {headers.map((header, idx) => (
                  <th key={idx} style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#ffffff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRight: idx < headers.length - 1 ? '1px solid rgba(255, 255, 255, 0.2)' : 'none'
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} style={{
                  background: rowIdx % 2 === 0 ? '#ffffff' : '#f9fafb',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  {row.map((cell, cellIdx) => {
                    // Format cell content with inline markdown
                    const formatted = cell
                      .replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #1e40af; font-weight: 700;">$1</strong>')
                      .replace(/`([^`]+)`/g, '<code style="background: #eff6ff; padding: 2px 5px; border-radius: 3px; font-size: 12px; color: #1e40af; font-family: monospace;">$1</code>');
                    
                    return (
                      <td key={cellIdx} style={{
                        padding: '12px 16px',
                        color: '#374151',
                        lineHeight: 1.6,
                        borderRight: cellIdx < row.length - 1 ? '1px solid #f3f4f6' : 'none',
                        verticalAlign: 'top'
                      }}
                      dangerouslySetInnerHTML={{ __html: formatted }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      
      i = j;
      continue;
    }

    // Headers with ### (Subsections)
    if (line.startsWith('###')) {
      const text = line.replace(/^###\s*/, '').replace(/^\d+\.\s*/, '');
      const number = line.match(/^###\s*(\d+)\./)?.[1];
      
      elements.push(
        <div key={key++} style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          padding: '14px 20px',
          borderRadius: 8,
          marginTop: 24,
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)'
        }}>
          <h4 style={{ 
            fontSize: 16, 
            fontWeight: 700, 
            color: '#ffffff',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            {number && (
              <span style={{
                background: 'rgba(255, 255, 255, 0.25)',
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700
              }}>
                {number}
              </span>
            )}
            {text}
          </h4>
        </div>
      );
      i++;
      continue;
    }

    // Headers with ## (Main sections)
    if (line.startsWith('##')) {
      const text = line.replace(/^##\s*/, '');
      elements.push(
        <div key={key++} style={{
          marginTop: 32,
          marginBottom: 20,
          paddingBottom: 12,
          borderBottom: '3px solid #3b82f6'
        }}>
          <h3 style={{ 
            fontSize: 20, 
            fontWeight: 700, 
            color: '#111827',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <span style={{
              width: 6,
              height: 28,
              background: 'linear-gradient(180deg, #3b82f6 0%, #1e40af 100%)',
              borderRadius: 3
            }}></span>
            {text}
          </h3>
        </div>
      );
      i++;
      continue;
    }

    // Bullet points (- or * at start)
    if (line.trim().match(/^[-*]\s/)) {
      const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
      const isNested = indent >= 2;
      const content = line.trim().replace(/^[-*]\s*/, '');
      const formatted = content
        .replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #1e40af; font-weight: 700;">$1</strong>')
        .replace(/`([^`]+)`/g, '<code style="background: #eff6ff; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #1e40af; font-family: monospace;">$1</code>');
      
      elements.push(
        <div key={key++} style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: 12, 
          marginBottom: 10,
          marginLeft: isNested ? 32 : 0,
          padding: '10px 14px',
          background: isNested ? '#f9fafb' : '#ffffff',
          borderLeft: `3px solid ${isNested ? '#93c5fd' : '#3b82f6'}`,
          borderRadius: 6,
          transition: 'all 0.2s'
        }}>
          <span style={{ 
            background: isNested ? '#93c5fd' : '#3b82f6',
            width: 20,
            height: 20,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#fff',
            fontSize: 12,
            fontWeight: 700
          }}>✓</span>
          <span 
            style={{ flex: 1, color: '#374151', lineHeight: 1.7, fontSize: 14 }}
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        </div>
      );
      i++;
      continue;
    }

    // Numbered lists
    if (line.trim().match(/^\d+\.\s/)) {
      const number = line.trim().match(/^(\d+)\./)?.[1];
      const content = line.trim().replace(/^\d+\.\s*/, '');
      const formatted = content
        .replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #1e40af; font-weight: 700;">$1</strong>')
        .replace(/`([^`]+)`/g, '<code style="background: #eff6ff; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #1e40af; font-family: monospace;">$1</code>');
      
      elements.push(
        <div key={key++} style={{ 
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
          marginBottom: 14,
          padding: '12px 16px',
          background: '#f8fafc',
          borderRadius: 8,
          border: '1px solid #e2e8f0'
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            width: 28,
            height: 28,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)'
          }}>
            {number}
          </span>
          <span 
            style={{ flex: 1, color: '#374151', lineHeight: 1.7, fontSize: 14 }}
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        </div>
      );
      i++;
      continue;
    }

    // Bold title lines (**Title Text**)
    if (line.trim().match(/^\*\*[^*]+\*\*$/)) {
      const title = line.trim().replace(/^\*\*|\*\*$/g, '');
      elements.push(
        <div key={key++} style={{
          margin: '20px 0 14px 0',
          padding: '12px 18px',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)'
        }}>
          <h5 style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '0.03em'
          }}>
            {title}
          </h5>
        </div>
      );
      i++;
      continue;
    }

    // Regular paragraphs with inline formatting
    const formatted = line
      .replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #1e40af; font-weight: 700; background: #eff6ff; padding: 1px 5px; border-radius: 3px;">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em style="color: #6b7280; font-style: italic;">$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #374151; border: 1px solid #e5e7eb; font-family: monospace;">$1</code>');
    
    elements.push(
      <p 
        key={key++} 
        style={{ 
          margin: '10px 0',
          color: '#4b5563', 
          lineHeight: 1.8,
          fontSize: 14
        }}
        dangerouslySetInnerHTML={{ __html: formatted }}
      />
    );
    i++;
  }

  return elements;
};



