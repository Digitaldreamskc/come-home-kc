export const confirmationMessage='Check your email to continue. If you already have an account, you can sign in or reset your password.';
export function existingAccountError(error:{code?:string;message?:string}){return ['user_already_exists','email_exists'].includes(error.code||'')||/already (registered|exists)/i.test(error.message||'');}
export function publicAuthError(error:{status?:number;message?:string}){return error.status===429?'Please wait a minute before trying again.':'Could not complete this request. Please try again or use the account recovery links below.';}
