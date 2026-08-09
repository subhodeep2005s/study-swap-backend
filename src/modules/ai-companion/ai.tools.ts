export const aiToolsDeclaration = {
  functionDeclarations: [
    {
      name: "CREATE_STUDY_PLAN",
      description: "Creates a new daily study plan with specific actionable tasks. Use this when the student asks for a routine or plan for today.",
      parameters: {
        type: "OBJECT",
        properties: {
          date: {
            type: "STRING",
            description: "Target date in YYYY-MM-DD format (e.g. 2026-08-08)."
          },
          plannedMinutes: {
            type: "INTEGER",
            description: "Total planned duration for the entire day in minutes."
          },
          tasks: {
            type: "ARRAY",
            description: "List of study tasks",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING", description: "Clear, actionable title of the task" },
                subject: { type: "STRING", description: "Academic subject (e.g., Physics, Maths)" },
                duration: { type: "INTEGER", description: "Duration in minutes" },
                priority: { type: "STRING", description: "Priority level: low, medium, or high" }
              },
              required: ["title", "subject", "duration", "priority"]
            }
          }
        },
        required: ["date", "plannedMinutes", "tasks"]
      }
    },
    {
      name: "RESCHEDULE_TASK",
      description: "Reschedules a specific existing task.",
      parameters: {
        type: "OBJECT",
        properties: {
          taskId: { type: "STRING", description: "The UUID of the task to reschedule" }
        },
        required: ["taskId"]
      }
    },
    {
      name: "GET_DAILY_PROGRESS",
      description: "Fetches the student's study progress and task status for a specific date to give them context on their current performance.",
      parameters: {
        type: "OBJECT",
        properties: {
          date: { type: "STRING", description: "Target date in YYYY-MM-DD format" }
        },
        required: ["date"]
      }
    }
  ]
};
