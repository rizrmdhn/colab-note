export const TypingIndicator = ({
  isOwnMessage,
}: {
  isOwnMessage: boolean;
}) => (
  <div
    className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
  >
    <div className="max-w-[80%] rounded-lg bg-gray-100 p-2">
      <div className="flex items-center space-x-1 px-2">
        <div
          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  </div>
);
