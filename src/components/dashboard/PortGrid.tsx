export function PortGrid({ ports, selectedPort, onSelect }) {
  return (
    <Box display="grid">
      {ports.map(p => (
        <PortCard
          key={p.port}
          port={p}
          selected={p.port === selectedPort}
          onClick={() => onSelect(p.port)}
        />
      ))}
    </Box>
  );
}