import { render, screen } from '@testing-library/react';
import { OwnershipTree } from '../src/components/OwnershipTree';

const files = [
  { filePath: 'c.js', owner: 'bob@example.com', ownerShare: 1, totalChanges: 3, authorCount: 1, classification: 'single-owner' as const, lastChangedAt: 1 },
  { filePath: 'a.js', owner: 'alice@example.com', ownerShare: 0.667, totalChanges: 3, authorCount: 2, classification: 'shared' as const, lastChangedAt: 1 },
  { filePath: 'legacy.js', owner: 'alice@example.com', ownerShare: 1, totalChanges: 1, authorCount: 1, classification: 'abandoned' as const, lastChangedAt: 0 }
];
const authors = [
  { author: 'bob@example.com', name: 'Bob Dev', commits: 4, filesTouched: 4 },
  { author: 'alice@example.com', name: 'Alice Dev', commits: 3, filesTouched: 3 }
];

test('groups files by ownership classification', () => {
  render(<OwnershipTree files={files} authors={authors} />);
  expect(screen.getByText(/single-owner \(1\)/)).toBeInTheDocument();
  expect(screen.getByText(/shared \(1\)/)).toBeInTheDocument();
  expect(screen.getByText(/abandoned \(1\)/)).toBeInTheDocument();
});

test('lists contributors', () => {
  render(<OwnershipTree files={files} authors={authors} />);
  expect(screen.getByText('Bob Dev')).toBeInTheDocument();
  expect(screen.getByText('Alice Dev')).toBeInTheDocument();
});
