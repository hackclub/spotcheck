class AuthorizedUser < ApplicationRecord
  # Send DM to one or more Slack users using this user's access token
  # 
  # @param slack_ids [String, Array<String>] Single Slack ID or array of IDs
  # @param message [String] Message to send
  # @return [Boolean] true if successful, false otherwise
  #
  # Behavior:
  # - Single ID: Direct DM to that user
  # - Multiple IDs: Find existing group DM with same members, or create new one
  # 
  # Examples:
  #   user.send_slack_dm("U123456", "Hello!")
  #   user.send_slack_dm(["U123", "U456"], "Group message")
  #   user.send_slack_dm(author.slack_id, "Your spot check is ready")
  def send_slack_dm(slack_ids, message)
    return false unless access_token.present?
    
    slack_ids = Array(slack_ids).compact.uniq
    return false if slack_ids.empty?
    
    begin
      if slack_ids.length == 1
        send_direct_dm(slack_ids.first, message)
      else
        send_group_dm(slack_ids, message)
      end
    rescue => e
      Rails.logger.error "Slack DM failed: #{e.message}"
      false
    end
  end

  private

  def slack_client
    @slack_client ||= begin
      require 'net/http'
      require 'json'
      SlackApiClient.new(access_token)
    end
  end

  def send_direct_dm(slack_id, message)
    # Open DM conversation with the user
    conversation = slack_client.open_conversation([slack_id])
    return false unless conversation
    
    # Send message to the conversation
    slack_client.send_message(conversation['channel']['id'], message)
  end

  def send_group_dm(slack_ids, message)
    # Include self in the group for finding existing conversations
    all_members = ([slack_user_id] + slack_ids).uniq.sort
    
    # Try to find existing group DM with these exact members
    existing_conversation = find_existing_group_dm(all_members)
    
    if existing_conversation
      # Use existing conversation
      slack_client.send_message(existing_conversation['id'], message)
    else
      # Create new group DM
      conversation = slack_client.open_conversation(slack_ids)
      return false unless conversation
      
      slack_client.send_message(conversation['channel']['id'], message)
    end
  end

  def find_existing_group_dm(member_ids)
    # Get list of DM conversations
    conversations = slack_client.list_conversations(types: 'mpim')
    return nil unless conversations
    
    # Find conversation with exact same members
    conversations['channels']&.find do |conv|
      conv_members = conv['members']&.sort || []
      conv_members == member_ids
    end
  end

  # Simple Slack API client wrapper
  class SlackApiClient
    def initialize(token)
      @token = token
      @base_url = 'https://slack.com/api'
    end

    def open_conversation(users)
      post('conversations.open', { users: users.join(',') })
    end

    def send_message(channel, text)
      post('chat.postMessage', { channel: channel, text: text })
    end

    def list_conversations(types: 'public_channel,private_channel,mpim,im')
      get('conversations.list', { types: types })
    end

    private

    def post(endpoint, params = {})
      make_request(:post, endpoint, params)
    end

    def get(endpoint, params = {})
      make_request(:get, endpoint, params)
    end

    def make_request(method, endpoint, params)
      uri = URI("#{@base_url}/#{endpoint}")
      
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      
      request = case method
                when :post
                  req = Net::HTTP::Post.new(uri)
                  req.set_form_data(params)
                  req
                when :get
                  uri.query = URI.encode_www_form(params) if params.any?
                  Net::HTTP::Get.new(uri)
                end
      
      request['Authorization'] = "Bearer #{@token}"
      request['Content-Type'] = 'application/x-www-form-urlencoded'
      
      response = http.request(request)
      
      if response.code.to_i == 200
        result = JSON.parse(response.body)
        result['ok'] ? result : nil
      else
        nil
      end
    end
  end
end
