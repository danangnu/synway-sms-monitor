import { Alert, Stack } from "@mui/material";

type AlertStackProps = {
  errorText: string;
  successText: string;
};

export default function AlertStack({
  errorText,
  successText
}: AlertStackProps) {
  if (!errorText && !successText) {
    return null;
  }

  return (
    <Stack spacing={1}>
      {errorText && <Alert severity="error">{errorText}</Alert>}
      {successText && <Alert severity="success">{successText}</Alert>}
    </Stack>
  );
}