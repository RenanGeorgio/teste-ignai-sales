// @ts-nocheck
import { Component, Fragment } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import Spinner from "@components/Email/spinner/spinner";
import TopBar from "@components/Email/top-bar/top-bar";
import SideBar from "@components/Email/side-bar/side-bar";
import MessageEditor from "@components/Email/message-editor/message-editor";
import MessageList from "@components/Email/message-list/message-list";
import MessageViewer from "@components/Email/message-viewer/message-viewer";
import MessageSnackbar from "@components/Email/message-snackbar/message-snackbar";
import ComposeFabButton from "@components/Email/buttons/compose-fab-button";
import { clearUserCredentials } from "@store/email/actions/application";
import { getCredentials, outbox as outboxSelector, pollInterval as pollIntervalSelector } from "@store/email/selectors/application";
import { getSelectedFolder } from "@store/email/selectors/folders";
import { editNewMessage } from "@services/email/application";
import { isDesktop } from "@services/email/configuration";
import { AuthenticationException } from "@services/email/fetch";
import { getFolders } from "@services/email/folder";
import { resetFolderMessagesCache } from "@services/email/message";
import mainCss from "@styles/email/main.scss";

interface Props {
  application: PropTypes.object;
  credentials: PropTypes.object;
  selectedFolder: PropTypes.object
  outbox: PropTypes.object;
  pollInterval: number;
  reloadFolders: PropTypes.func;
  reloadMessageCache: PropTypes.func;
  newMessage: PropTypes.func.isRequired;
  logout: PropTypes.func;
};

const MessageEditorWrapper = ({ applicationNewMessage }) => (
  (applicationNewMessage && Object.keys(applicationNewMessage).length > 0) &&
  <div className={mainCss['main-layout__message-editor-wrapper']}>
    <div className={mainCss['message-editor__scrim']}></div>
    <MessageEditor/>
  </div>
);

class Email extends Component {
  application: PropTypes.object;
  credentials: PropTypes.object;
  selectedFolder: PropTypes.object;
  outbox: PropTypes.object;
  pollInterval: number;
  reloadFolders: PropTypes.func;
  reloadMessageCache: PropTypes.func;
  newMessage: PropTypes.func.isRequired;
  logout: PropTypes.func;

  constructor(props: Props) {
    super(props);
    this.state = {
      sideBar: {
        collapsed: !isDesktop()
      }
    };

    this.toggleSideBar = this.toggleSideBar.bind(this);
  }

  componentDidMount() {
    document.title = this.props.application.title;
    this.startPoll();
  }

  componentDidUpdate() {
    this.startPoll();
  }

  componentWillUnmount() {
    clearTimeout(this.refreshPollTimeout);
  }

  renderContent() {
    const {application, outbox} = this.props;

    if (application.selectedMessage && Object.keys(application.selectedMessage).length > 0) {
      return <MessageViewer className={mainCss['main-layout__message-viewer']} />;
    }

    return (
      <Fragment>
        <MessageList className={mainCss['main-layout__message-list']} />
        <div className={mainCss['main-layout__fab-container']}>
          {outbox === null && <ComposeFabButton onClick={() => this.props.newMessage()}/>}
        </div>
      </Fragment>
    );
  }

  startPoll() {
    if (this.props.selectedFolder && !this.pollStarted) {
      this.pollStarted = true;
      this.refreshPoll();
    }
  }

  /**
   * Poll function that will refresh the folder list and the INBOX folder.
   *
   * @returns {Promise<void>}
   */
  async refreshPoll() {
    let keepPolling = true;

    const {pollInterval, reloadFolders, reloadMessageCache, logout} = this.props;

    try {
      const folderPromise = reloadFolders();
      const messagePromise = reloadMessageCache();

      await Promise.all([folderPromise, messagePromise]);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Error in refresh poll: ${e}`);

      if (e instanceof AuthenticationException) {
        keepPolling = false;
        logout();
      }
    }

    if (keepPolling) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.refreshPollTimeout = setTimeout(this.refreshPoll.bind(this), pollInterval);
    }
  }

  toggleSideBar() {
    const toggleCollapsed = !this.state.sideBar.collapsed;

    this.setState({
      sideBar: {
        collapsed: toggleCollapsed
      }
    });
  }

  render() {
    const { application } = this.props;
    const { sideBar } = this.state;

    return (
      <div className={`${mainCss['main-layout']}
          ${sideBar.collapsed ? '' : mainCss['main-layout--with-side-bar']}`}>
        <Spinner
          visible={application.activeRequests > 0}
          className={mainCss['main-layout__spinner']} pathClassName={mainCss['spinner-path']}/>
        <TopBar sideBarCollapsed={sideBar.collapsed} sideBarToggle={() => this.toggleSideBar()}/>
        <SideBar collapsed={sideBar.collapsed} sideBarToggle={() => this.toggleSideBar()}/>
        <div className={mainCss['mdc-drawer-scrim']} onClick={() => this.toggleSideBar()}></div>
        <div className={`${mainCss['mdc-top-app-bar--fixed-adjust']} ${mainCss['main-layout__content-wrapper']}`}>
          {this.renderContent()}
        </div>
        <MessageEditorWrapper {...this.props}/>
        <MessageSnackbar/>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  application: state.email.application,
  credentials: getCredentials(state),
  applicationNewMessage: state.email.application.newMessage,
  selectedFolder: getSelectedFolder(state),
  outbox: outboxSelector(state),
  pollInterval: pollIntervalSelector(state)
});

const mapDispatchToProps = dispatch => ({
  reloadFolders: credentials => getFolders(dispatch, credentials, true),
  reloadMessageCache: (user, folder) => resetFolderMessagesCache(dispatch, user, folder),
  newMessage: () => editNewMessage(dispatch),
  logout: () => {
    dispatch(clearUserCredentials())
  }
});

const mergeProps = (stateProps, dispatchProps, ownProps) => (Object.assign({}, stateProps, dispatchProps, ownProps, {
  reloadFolders: () => dispatchProps.reloadFolders(stateProps.credentials),
  reloadMessageCache: () => dispatchProps.reloadMessageCache(stateProps.application.user, stateProps.selectedFolder)
}));

export default connect(mapStateToProps, mapDispatchToProps, mergeProps)(Email);