import { getNodeLabel } from "@ory/integrations/ui";
import { Button } from "@canonical/react-components";
import React, { FC, FormEvent } from "react";
import { NodeInputProps } from "./helpers";
import {
  ORY_LABEL_ID_ADD_SECURITY_KEY,
  WEBAUTHN_AUTOLOGIN_KEY,
  WEBAUTHN_AUTOLOGIN_VALUE,
} from "../util/constants";

const getWebAuthnPayload = (evalCode: string): unknown => {
  const tmp = evalCode
    .replace("window.oryWebAuthnRegistration(", "")
    .replace("window.oryWebAuthnLogin(", "");
  const raw = tmp.substring(0, tmp.length - 1);
  return JSON.parse(raw) as unknown;
};

interface WebauthnWindow extends Window {
  oryWebAuthnRegistration: (a: unknown) => void;
  oryWebAuthnLogin: (a: unknown) => void;
  __oryStartedLogin: boolean;
}

export const NodeInputButton: FC<NodeInputProps> = ({
  node,
  attributes,
  setValue,
  disabled,
  dispatchSubmit,
}) => {
  const onClick = attributes.onclick ?? "";

  const startWebAuthnLogin = () => {
    const webauthnWindow = window as unknown as WebauthnWindow;
    const loginParams = getWebAuthnPayload(onClick);

    if (webauthnWindow.__oryStartedLogin) {
      return;
    }
    webauthnWindow.__oryStartedLogin = true;

    // retry login until the webauthn.js script is finished loading
    // and the oryWebAuthnLogin function is available
    const triggerWebauthnLogin = (count: number) =>
      setTimeout(() => {
        if ("oryWebAuthnLogin" in webauthnWindow) {
          webauthnWindow.oryWebAuthnLogin(loginParams);
        } else if (count < 100) {
          triggerWebauthnLogin(count + 1);
        }
      }, 100);

    triggerWebauthnLogin(0);
  };

  // automatically start the webauthn login
  const isWebAuthnAutoLogin =
    localStorage.getItem(WEBAUTHN_AUTOLOGIN_KEY) === WEBAUTHN_AUTOLOGIN_VALUE;
  const isContinueNode = getNodeLabel(node) === "Continue";
  if (
    onClick?.startsWith("window.oryWebAuthnLogin(") &&
    (isWebAuthnAutoLogin || isContinueNode)
  ) {
    startWebAuthnLogin();
  }

  const handleClick = (e: MouseEvent | FormEvent) => {
    // webauthn has a custom handler in webauthn.js to be called
    // preventing the call of eval with below code
    if (onClick?.startsWith("window.oryWebAuthnRegistration(")) {
      e.stopPropagation();
      e.preventDefault();

      const nameSelector = '*[name="webauthn_register_displayname"]';
      const name = document.querySelector(nameSelector) as HTMLInputElement;

      if (!name?.value) {
        name.classList.add("is-error");
        name.setAttribute("aria-invalid", "true");
        name.setAttribute("aria-errormessage", "Required field");

        if (!name.nextElementSibling) {
          const warning = document.createElement("p");
          warning.className = "p-form-validation__message";
          warning.textContent = "Required field";
          name.after(warning);
        }

        const groupSelector = ".p-form-validation";
        const group = document.querySelectorAll(groupSelector);
        group.forEach((e) => e.classList.add("is-error"));

        return;
      }

      const webauthnWindow = window as unknown as WebauthnWindow;
      const registrationParams = getWebAuthnPayload(onClick);
      webauthnWindow.oryWebAuthnRegistration(registrationParams);

      return;
    }

    if (onClick?.startsWith("window.oryWebAuthnLogin(")) {
      e.stopPropagation();
      e.preventDefault();

      const webauthnWindow = window as unknown as WebauthnWindow;
      const loginParams = getWebAuthnPayload(onClick);
      webauthnWindow.oryWebAuthnLogin(loginParams);

      return;
    }

    void setValue(attributes.value as string).then(() => dispatchSubmit(e));
  };

  // add security key button is supposed to be positive green
  const appearance =
    node.meta.label?.id === ORY_LABEL_ID_ADD_SECURITY_KEY ? "positive" : "";

  return (
    <>
      <Button
        appearance={appearance}
        onClick={handleClick}
        disabled={attributes.disabled || disabled}
        name={attributes.name}
      >
        {getNodeLabel(node)}
      </Button>
    </>
  );
};
