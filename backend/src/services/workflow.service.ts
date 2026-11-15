import { db } from '../db/store';
import { Workflow, WorkflowStep } from '../types';
import { AppError } from '../middleware/errorHandler';

export class WorkflowService {
  static listWorkflows(): Workflow[] {
    return db.workflows.map((wf) => ({
      ...wf,
      steps: db.workflowSteps
        .filter((s) => s.workflowId === wf.id)
        .sort((a, b) => a.order - b.order),
    }));
  }

  static getWorkflowById(id: string): Workflow {
    const wf = db.workflows.find((w) => w.id === id);
    if (!wf) {
      throw new AppError('Workflow not found', 404);
    }
    const steps = db.workflowSteps
      .filter((s) => s.workflowId === wf.id)
      .sort((a, b) => a.order - b.order);
    return { ...wf, steps };
  }

  static createWorkflow(
    data: {
      name: string;
      description?: string;
      type: string;
      steps: Array<{ name: string; approverRole: any }>;
    },
    createdById: string
  ): Workflow {
    const now = new Date().toISOString();
    const wfId = `wf-${Date.now()}`;

    const newSteps: WorkflowStep[] = data.steps.map((st, idx) => ({
      id: `step-${wfId}-${idx + 1}`,
      workflowId: wfId,
      name: st.name,
      order: idx + 1,
      approverRole: st.approverRole,
      approverId: null,
      createdAt: now,
      updatedAt: now,
    }));

    const newWorkflow: Workflow = {
      id: wfId,
      name: data.name,
      description: data.description || null,
      type: data.type.toUpperCase(),
      status: 'ACTIVE',
      createdById,
      steps: newSteps,
      createdAt: now,
      updatedAt: now,
    };

    db.workflows.unshift(newWorkflow);
    db.workflowSteps.push(...newSteps);

    return newWorkflow;
  }
}
