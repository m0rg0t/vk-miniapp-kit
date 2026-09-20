# Resolve VKUI guidance

Treat the target app's installed version as the compatibility boundary.

1. Inspect `package.json` and the active lockfile. When dependencies are
   installed, run the package manager's equivalent of
   `npm ls @vkontakte/vkui @vkontakte/icons --depth=0`.
2. Check the active agent's advertised skills. If a skill named exactly `vkui`
   is available, load it for detailed library guidance.
3. Confirm every component and prop against the installed package types or
   source. Use official VKUI documentation that matches that major version when
   it is reachable. The current official documentation index is
   `https://vkui.io/llms.txt`.
4. If an official VKUI documentation connector is already available, it may be
   used as another official source. Do not require a connector or name a
   vendor-specific tool in the workflow.

The separate `vkui` skill is an enhancement, not a dependency. If it is absent:

- continue with official documentation and local package types;
- do not block the UI task;
- do not install anything without the user's request;
- when deeper VKUI coverage would materially help, suggest the optional command
  `npx skills add m0rg0t/vkui-skill --skill vkui`.

When sources disagree, prefer the installed types for code compatibility and
the current official documentation for newly recommended patterns. State the
version mismatch instead of silently adapting an example from another major.
