import { describe, it, expect } from 'vitest';
import { DocumentStatus } from '@/constants/documentStatuses';
import { TaskStatus } from '@/constants/taskStatuses';
import { canTransitionDocument, canTransitionTask } from '@/constants/stateMachine';

describe('Document State Machine', () => {
  describe('DRAFT transitions', () => {
    it('może przejść do CONFIRMED', () => {
      expect(canTransitionDocument(DocumentStatus.DRAFT, DocumentStatus.CONFIRMED)).toBe(true);
    });

    it('może przejść do CANCELLED', () => {
      expect(canTransitionDocument(DocumentStatus.DRAFT, DocumentStatus.CANCELLED)).toBe(true);
    });

    it('nie może przejść do COMPLETED', () => {
      expect(canTransitionDocument(DocumentStatus.DRAFT, DocumentStatus.COMPLETED)).toBe(false);
    });

    it('nie może przejść do IN_PROGRESS', () => {
      expect(canTransitionDocument(DocumentStatus.DRAFT, DocumentStatus.IN_PROGRESS)).toBe(false);
    });
  });

  describe('CONFIRMED transitions', () => {
    it('może przejść do IN_PROGRESS', () => {
      expect(canTransitionDocument(DocumentStatus.CONFIRMED, DocumentStatus.IN_PROGRESS)).toBe(
        true,
      );
    });

    it('może przejść do CANCELLED', () => {
      expect(canTransitionDocument(DocumentStatus.CONFIRMED, DocumentStatus.CANCELLED)).toBe(true);
    });

    it('nie może cofnąć do DRAFT', () => {
      expect(canTransitionDocument(DocumentStatus.CONFIRMED, DocumentStatus.DRAFT)).toBe(false);
    });
  });

  describe('COMPLETED transitions', () => {
    it('nie może przejść nigdzie', () => {
      expect(canTransitionDocument(DocumentStatus.COMPLETED, DocumentStatus.DRAFT)).toBe(false);
      expect(canTransitionDocument(DocumentStatus.COMPLETED, DocumentStatus.CANCELLED)).toBe(false);
      expect(canTransitionDocument(DocumentStatus.COMPLETED, DocumentStatus.IN_PROGRESS)).toBe(
        false,
      );
    });
  });

  describe('CANCELLED transitions', () => {
    it('nie może przejść nigdzie', () => {
      expect(canTransitionDocument(DocumentStatus.CANCELLED, DocumentStatus.DRAFT)).toBe(false);
      expect(canTransitionDocument(DocumentStatus.CANCELLED, DocumentStatus.CONFIRMED)).toBe(false);
    });
  });
});

describe('Task State Machine', () => {
  describe('NEW transitions', () => {
    it('może przejść do ASSIGNED', () => {
      expect(canTransitionTask(TaskStatus.NEW, TaskStatus.ASSIGNED)).toBe(true);
    });

    it('może przejść do CANCELLED', () => {
      expect(canTransitionTask(TaskStatus.NEW, TaskStatus.CANCELLED)).toBe(true);
    });

    it('nie może przejść do COMPLETED', () => {
      expect(canTransitionTask(TaskStatus.NEW, TaskStatus.COMPLETED)).toBe(false);
    });
  });

  describe('ASSIGNED transitions', () => {
    it('może przejść do IN_PROGRESS', () => {
      expect(canTransitionTask(TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS)).toBe(true);
    });

    it('nie może cofnąć do NEW', () => {
      expect(canTransitionTask(TaskStatus.ASSIGNED, TaskStatus.NEW)).toBe(false);
    });
  });

  describe('IN_PROGRESS transitions', () => {
    it('może przejść do COMPLETED', () => {
      expect(canTransitionTask(TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED)).toBe(true);
    });

    it('może przejść do CANCELLED', () => {
      expect(canTransitionTask(TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED)).toBe(true);
    });
  });

  describe('COMPLETED transitions', () => {
    it('nie może przejść nigdzie', () => {
      expect(canTransitionTask(TaskStatus.COMPLETED, TaskStatus.NEW)).toBe(false);
      expect(canTransitionTask(TaskStatus.COMPLETED, TaskStatus.CANCELLED)).toBe(false);
    });
  });
});
