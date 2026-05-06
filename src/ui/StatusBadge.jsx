import React from 'react';

const labels = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
};

export default function StatusBadge({ status }) {
  return <span className={`status-badge ${status?.toLowerCase()}`}>{labels[status] || status}</span>;
}
