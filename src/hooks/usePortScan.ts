export function usePortScan(config: SynwayConfig) {
  const [ports, setPorts] = useState<DashboardPortCard[]>([]);
  const [messages, setMessages] = useState<SynwaySmsMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const states = await getPortStates(config);
    const sms = await getAllSms(config, states.length);
    setPorts(buildDashboardPorts(states, sms));
    setMessages(sms);
    setLoading(false);
  };

  return { ports, messages, loading, refresh };
}