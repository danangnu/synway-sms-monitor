type PortCardProps = {
  port: DashboardPortCard;
  selected: boolean;
  onClick: () => void;
};

export function PortCard({ port, selected, onClick }: PortCardProps) {
  return (
    <Card onClick={onClick}>
      <Typography>Port {port.port}</Typography>
      <Chip label={port.state} />
      <Typography>SMS: {port.smsCount}</Typography>
    </Card>
  );
}