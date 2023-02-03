/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vscode-nls';
import { NodeType } from './constants';
const localize = nls.loadMessageBundle();
import { ObjectManagement } from 'mssql';

// Util functions
export function getNodeTypeDisplayName(type: string, inTitle: boolean = false): string {
	switch (type) {
		case NodeType.Login:
			return inTitle ? LoginTypeDisplayNameInTitle : LoginTypeDisplayName;
		case NodeType.User:
			return inTitle ? UserTypeDisplayNameInTitle : UserTypeDisplayName;
		default:
			throw new Error(`Unkown node type: ${type}`);
	}
}

export function getAuthenticationTypeDisplayName(authType: ObjectManagement.AuthenticationType): string {
	switch (authType) {
		case 'Windows':
			return WindowsAuthenticationTypeDisplayText;
		case 'AAD':
			return AADAuthenticationTypeDisplayText;
		default:
			return SQLAuthenticationTypeDisplayText;
	}
}

export function getAuthenticationTypeByDisplayName(displayValue: string): ObjectManagement.AuthenticationType {
	switch (displayValue) {
		case WindowsAuthenticationTypeDisplayText:
			return 'Windows';
		case AADAuthenticationTypeDisplayText:
			return 'AAD';
		default:
			return 'Sql';
	}
}

// Object Types
export const LoginTypeDisplayName: string = localize('objectManagement.LoginTypeDisplayName', "login");
export const UserTypeDisplayName: string = localize('objectManagement.UserDisplayName', "user");
export const LoginTypeDisplayNameInTitle: string = localize('objectManagement.LoginTypeDisplayNameInTitle', "Login");
export const UserTypeDisplayNameInTitle: string = localize('objectManagement.UserTypeDisplayNameInTitle', "User");

// Shared Strings
export const YesText: string = localize('objectManagement.yesText', "Yes");
export const OkText: string = localize('objectManagement.OkText', "OK");
export const LoadingDialogText: string = localize('objectManagement.loadingDialog', "Loading dialog...")
export const ValidationErrorSummary: string = localize('objectManagement.ValidationErrorSummary', "There are some validation errors.")
export function RefreshObjectExplorerError(error: string): string {
	return localize({
		key: 'objectManagement.refreshOEError',
		comment: ['{0}: error message.']
	}, "An error occurred while while refreshing the object explorer. {0}", error);
}

export function DeleteObjectConfirmationText(objectType: string, objectName: string): string {
	return localize({
		key: 'objectManagement.deleteObjectConfirmation',
		comment: ['{0} object type, {1}: object name.']
	}, "Are you sure you want to delete the {0}: {1}?", objectType, objectName);
}

export function CreateObjectOperationDisplayName(objectType: string): string {
	return localize({
		key: 'objectManagement.createObjectOperationName',
		comment: ['{0} object type']
	}, "Create {0}", objectType);
}

export function UpdateObjectOperationDisplayName(objectType: string, objectName: string): string {
	return localize({
		key: 'objectManagement.updateObjectOperationName',
		comment: ['{0} object type, {1}: object name.']
	}, "Update {0} '{1}'", objectType, objectName);
}

export function DeleteObjectOperationDisplayName(objectType: string, objectName: string): string {
	return localize({
		key: 'objectManagement.deleteObjectOperationName',
		comment: ['{0} object type, {1}: object name.']
	}, "Delete {0} '{1}'", objectType, objectName);
}

export function DeleteObjectError(objectType: string, objectName: string, error: string): string {
	return localize({
		key: 'objectManagement.deleteObjectError',
		comment: ['{0} object type, {1}: object name, {2}: error message.']
	}, "An error occurred while deleting the {0}: {1}. {2}", objectType, objectName, error);
}

export function OpenObjectPropertiesDialogError(objectType: string, objectName: string, error: string): string {
	return localize({
		key: 'objectManagement.openObjectPropertiesDialogError',
		comment: ['{0} object type, {1}: object name, {2}: error message.']
	}, "An error occurred while opening the properties dialog for {0}: {1}. {2}", objectType, objectName, error);
}

export function OpenNewObjectDialogError(objectType: string, error: string): string {
	return localize({
		key: 'objectManagement.openNewObjectDialogError',
		comment: ['{0} object type, {1}: error message.']
	}, "An error occurred while opening the new {0} dialog. {1}", objectType, error);
}

export function NewObjectDialogTitle(objectType: string): string {
	return localize({
		key: 'objectManagement.newObjectDialogTitle',
		comment: ['{0} object type.']
	}, '{0} - New', objectType);
}

export function ObjectPropertiesDialogTitle(objectType: string, objectName: string): string {
	return localize({
		key: 'objectManagement.objectPropertiesDialogTitle',
		comment: ['{0} object type, {1}: object name.']
	}, '{0} - {1}', objectType, objectName);
}

export const NameText = localize('objectManagement.nameLabel', "Name");
export const SelectedText = localize('objectManagement.selectedLabel', "Selected");
export const GeneralSectionHeader = localize('objectManagement.generalSectionHeader', "General");
export const AdvancedSectionHeader = localize('objectManagement.advancedSectionHeader', "Advanced");
export const PasswordText = localize('objectManagement.passwordLabel', "Password");
export const ConfirmPasswordText = localize('objectManagement.confirmPasswordLabel', "Confirm password");
export const EnabledText = localize('objectManagement.enabledLabel', "Enabled");
export const NameCannotBeEmptyError = localize('objectManagement.nameCannotBeEmptyError', "Name cannot be empty.");
export const PasswordsNotMatchError = localize('objectManagement.passwordsNotMatchError', "Password must match the confirm password.");

// Login
export const BlankPasswordConfirmationText: string = localize('objectManagement.blankPasswordConfirmation', "Creating a login with a blank password is a security risk.  Are you sure you want to continue?");
export const DeleteLoginConfirmationText: string = localize('objectManagement.deleteLoginConfirmation', "Deleting server logins does not delete the database users associated with the logins. To complete the process, delete the users in each database. It may be necessary to first transfer the ownership of schemas to new users.");
export const SQLAuthenticationSectionHeader = localize('objectManagement.login.sqlAuthSectionHeader', "SQL Authentication");
export const ServerRoleSectionHeader = localize('objectManagement.login.serverRoleSectionHeader', "Server Roles");
export const AuthTypeText = localize('objectManagement.login.authenticateType', "Authentication");
export const SpecifyOldPasswordText = localize('objectManagement.login.specifyOldPasswordLabel', "Specify old password");
export const OldPasswordText = localize('objectManagement.login.oldPasswordLabel', "Old password");
export const EnforcePasswordPolicyText = localize('objectManagement.login.enforcePasswordPolicyLabel', "Enforce password policy");
export const EnforcePasswordExpirationText = localize('objectManagement.login.enforcePasswordExpirationLabel', "Enforce password expiration");
export const MustChangePasswordText = localize('objectManagement.login.mustChangePasswordLabel', "User must change password at next login");
export const DefaultDatabaseText = localize('objectManagement.login.defaultDatabaseLabel', "Default database");
export const DefaultLanguageText = localize('objectManagement.login.defaultLanguageLabel', "Default language");
export const PermissionToConnectText = localize('objectManagement.login.permissionToConnectLabel', "Permission to connect to database engine");
export const LoginLockedOutText = localize('objectManagement.login.lockedOutLabel', "Login is locked out");
export const WindowsAuthenticationTypeDisplayText = localize('objectManagement.login.windowsAuthenticationType', "Windows Authentication");
export const SQLAuthenticationTypeDisplayText = localize('objectManagement.login.sqlAuthenticationType', "SQL Authentication");
export const AADAuthenticationTypeDisplayText = localize('objectManagement.login.aadAuthenticationType', "Azure Active Directory Authentication");
export const OldPasswordCannotBeEmptyError = localize('objectManagement.login.oldPasswordCannotBeEmptyError', "Old password cannot be empty.");

// User
export const UserTypeText = localize('objectManagement.user.type', "Type");
export const UserWithLoginText = localize('objectManagement.user.userWithLogin', "User with login");
export const UserWithWindowsGroupLoginText = localize('objectManagement.user.userWithGroupLogin', "User with Windows group login");
export const ContainedUserText = localize('objectManagement.user.containedUser', "Contained user");
export const UserWithNoConnectAccess = localize('objectManagement.user.userWithNoConnectAccess', "User with no connect access");
export const DefaultSchemaText = localize('objectManagement.user.defaultSchemaLabel', "Default schema");
export const LoginText = localize('objectManagement.user.loginLabel', "Login");
export const OwnedSchemaSectionHeader = localize('objectManagement.user.ownedSchemasLabel', "Owned Schemas");
export const MembershipSectionHeader = localize('objectManagement.user.membershipLabel', "Membership");

export function getUserTypeDisplayName(userType: ObjectManagement.UserType): string {
	switch (userType) {
		case 'Login':
			return UserWithLoginText;
		case 'WindowsGroupLogin':
			return UserWithWindowsGroupLoginText;
		case 'Contained':
			return ContainedUserText;
		default:
			return UserWithNoConnectAccess;
	}
}

export function getUserTypeByDisplayName(userTypeDisplayName: string): ObjectManagement.UserType {
	switch (userTypeDisplayName) {
		case UserWithLoginText:
			return 'Login';
		case UserWithWindowsGroupLoginText:
			return 'WindowsGroupLogin';
		case ContainedUserText:
			return 'Contained';
		default:
			return 'NoConnectAccess';
	}
}
