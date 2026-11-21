import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  action?: React.ReactNode;
}

export const EmptyState = ({ title, description, icon = "🎵", action }: EmptyStateProps) => {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-snes-grey-dark flex items-center justify-center">
        <span className="text-4xl">{icon}</span>
      </div>
      <h3 className="font-pixel text-base text-gb-green mb-2">{title}</h3>
      <p className="font-pixel text-xs text-snes-grey mb-4">{description}</p>
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
};