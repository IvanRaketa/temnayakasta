export interface FormState {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const initialState: FormState = {};
