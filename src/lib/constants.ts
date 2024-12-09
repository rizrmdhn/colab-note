export const SONNER_DEFAULT_TOAST_DURATION = 1500;

export const SONNER_WARNING_TOAST_DURATION = 3000;

export const AVALIABLE_COLLABORATOR_TYPE = [
  "admin",
  "editor",
  "viewer",
] as const;

export const DEFAULT_EDITOR_VALUES = [
  {
    children: [{ text: "Welcome to your new note!" }],
    type: "h1",
  },
  {
    children: [
      { text: "This is a collaborative note. " },
      { bold: true, text: "Invite collaborators" },
      { text: " to work together in real-time." },
    ],
    type: "p",
  },
];
