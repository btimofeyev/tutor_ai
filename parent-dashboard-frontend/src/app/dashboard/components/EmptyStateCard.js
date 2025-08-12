// Empty state cards for various dashboard scenarios
'use client';
import React from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/navigation';
import Button from '../../../components/ui/Button';

export function LoadingStateCard({ message }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-xl text-text-secondary">{message}</div>
    </div>
  );
}

export function NoChildSelectedCard({ hasChildren }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-text-secondary italic text-xl text-center">
        {hasChildren
          ? "Select a student to get started."
          : "No students found. Please add a student to begin."}
      </div>
    </div>
  );
}

export function NoSubjectsCard({ childName }) {
  const router = useRouter();

  return (
    <div className="text-center p-6 bg-background-card rounded-lg shadow border border-border-subtle">
      <div className="text-4xl mb-3">📚</div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        Set Up {childName}&apos;s Subjects
      </h3>
      <p className="text-text-secondary mb-4 text-sm">
        Add the subjects your child will be studying to get started.
      </p>
      <Button
        onClick={() => router.push("/subject-management")}
        variant="primary"
        className="px-4 py-2 text-sm"
      >
        Add Subjects
      </Button>
    </div>
  );
}

LoadingStateCard.propTypes = {
  message: PropTypes.string.isRequired
};

NoChildSelectedCard.propTypes = {
  hasChildren: PropTypes.bool.isRequired
};

NoSubjectsCard.propTypes = {
  childName: PropTypes.string.isRequired
};
