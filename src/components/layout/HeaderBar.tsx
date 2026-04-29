type HeaderBarProps = {
  config: SynwayConfig;
  connected: boolean;
  loading: boolean;
  lastSync: string;
  onChangeConfig: (c: SynwayConfig) => void;
  onConnect: () => void;
  onRefresh: () => void;
  onSave: () => void;
  onStop: () => void;
};

export function HeaderBar(props: HeaderBarProps) {
  const {
    config,
    connected,
    loading,
    lastSync,
    onChangeConfig,
    onConnect,
    onRefresh,
    onSave,
    onStop
  } = props;

  return (
    <Paper sx={{ p: 2 }}>
      {/* status + buttons */}
      {/* device URL / username / password fields */}
    </Paper>
  );
}